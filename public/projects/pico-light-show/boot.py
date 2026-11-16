import array, time, math, random
from machine import Pin
import rp2

NUM_LEDS = 20
PIN_NUM = 22
brightness = 0.3

EFFECT_SECONDS = 15  # how long each effect plays before moving on
FADE_FRAMES = 50     # length of the crossfade between effects
FRAME_MS = 20        # 50 frames per second

@rp2.asm_pio(sideset_init=rp2.PIO.OUT_LOW,
             out_shiftdir=rp2.PIO.SHIFT_LEFT,
             autopull=True, pull_thresh=24)
def ws2812():
    T1 = 2
    T2 = 5
    T3 = 3
    wrap_target()
    label("bitloop")
    out(x, 1)               .side(0)    [T3 - 1]
    jmp(not_x, "do_zero")   .side(1)    [T1 - 1]
    jmp("bitloop")          .side(1)    [T2 - 1]
    label("do_zero")
    nop()                   .side(0)    [T2 - 1]
    wrap()

sm = rp2.StateMachine(0, ws2812, freq=8_000_000,
                      sideset_base=Pin(PIN_NUM))
sm.active(1)
ar = array.array("I", [0 for _ in range(NUM_LEDS)])

BLACK = (0, 0, 0)

# Gamma correction (with brightness baked in) so fades look smooth to the eye.
# Any non-zero input keeps at least 1 so dim tails don't vanish abruptly.
GAMMA = bytearray(256)
for _i in range(1, 256):
    GAMMA[_i] = max(1, int(((_i / 255) ** 2.0) * 255 * brightness + 0.5))

# 0-255 sine lookup, much faster than math.sin inside the frame loop
SIN8 = bytearray(int(127.5 + 127.5 * math.sin(_i * 2 * math.pi / 256))
                 for _i in range(256))


# ---------------------------------------------------------------- helpers

def show(px):
    for i in range(NUM_LEDS):
        r, g, b = px[i]
        ar[i] = (GAMMA[g] << 16) | (GAMMA[r] << 8) | GAMMA[b]
    sm.put(ar, 8)


def hsv(h, s=255, v=255):
    # h, s, v all 0-255 -> (r, g, b)
    h &= 255
    if s == 0:
        return (v, v, v)
    region = h // 43
    rem = (h - region * 43) * 6
    p = (v * (255 - s)) >> 8
    q = (v * (255 - ((s * rem) >> 8))) >> 8
    t = (v * (255 - ((s * (255 - rem)) >> 8))) >> 8
    if region == 0:
        return (v, t, p)
    if region == 1:
        return (q, v, p)
    if region == 2:
        return (p, v, t)
    if region == 3:
        return (p, q, v)
    if region == 4:
        return (t, p, v)
    return (v, p, q)


def fade_all(px, keep):
    # keep: 0-256, how much of each pixel survives this frame
    for i in range(NUM_LEDS):
        r, g, b = px[i]
        px[i] = ((r * keep) >> 8, (g * keep) >> 8, (b * keep) >> 8)


def add(px, i, colour, k=1.0):
    # Additive blend, clipped to 255
    if 0 <= i < NUM_LEDS:
        r, g, b = px[i]
        px[i] = (min(255, r + int(colour[0] * k)),
                 min(255, g + int(colour[1] * k)),
                 min(255, b + int(colour[2] * k)))


def draw_dot(px, pos, colour):
    # Anti-aliased dot at a fractional position, so motion looks silky
    i = int(pos)
    f = pos - i
    add(px, i, colour, 1 - f)
    add(px, i + 1, colour, f)


# ---------------------------------------------------------------- effects
# Each effect is a generator: it draws one frame into px, then yields.

def power_up(px):
    # Two sparks race in from the ends, collide in a flash, and the
    # explosion blooms outward as a rainbow.
    centre = (NUM_LEDS - 1) / 2
    pos, vel = 0.0, 0.12
    while pos < centre:
        fade_all(px, 140)
        draw_dot(px, pos, (160, 190, 255))
        draw_dot(px, NUM_LEDS - 1 - pos, (160, 190, 255))
        pos += vel
        vel *= 1.07
        yield
    for k in range(8):
        v = 255 - k * 25
        for i in range(NUM_LEDS):
            px[i] = (v, v, v)
        yield
    radius = 0.0
    while radius < centre + 3:
        for i in range(NUM_LEDS):
            d = abs(i - centre)
            if d <= radius - 1:
                px[i] = hsv(int(d * 256 / NUM_LEDS), 255, 255)
            elif d <= radius:
                px[i] = (255, 255, 255)   # white shock-wave edge
            else:
                r, g, b = px[i]
                px[i] = ((r * 200) >> 8, (g * 200) >> 8, (b * 200) >> 8)
        radius += 0.35
        yield
    while True:
        yield


def rainbow_glitter(px):
    # Flowing rainbow with rolling brightness waves and white glitter
    t = 0
    while True:
        for i in range(NUM_LEDS):
            v = 140 + ((SIN8[(i * 20 - t * 4) & 255] * 115) >> 8)
            px[i] = hsv(t * 2 + i * 256 // NUM_LEDS, 255, v)
        if random.randint(0, 99) < 25:
            px[random.randint(0, NUM_LEDS - 1)] = (255, 255, 255)
        t += 1
        yield


def twin_comets(px):
    # Two comets in complementary colours bounce around; every time they
    # cross, they throw off a shower of sparks.
    a_pos, a_vel = 0.0, 0.35
    b_pos, b_vel = NUM_LEDS - 1.0, -0.27
    last = NUM_LEDS - 1
    hue = 0
    sparks = []
    was_close = False
    while True:
        fade_all(px, 185)

        a_pos += a_vel
        b_pos += b_vel
        if a_pos < 0 or a_pos > last:
            a_vel = -a_vel
            a_pos = max(0.0, min(last, a_pos))
        if b_pos < 0 or b_pos > last:
            b_vel = -b_vel
            b_pos = max(0.0, min(last, b_pos))

        close = abs(a_pos - b_pos) < 1.0
        if close and not was_close:
            mid = (a_pos + b_pos) / 2
            for _ in range(8):
                sparks.append([mid, random.uniform(-0.7, 0.7), 255.0])
        was_close = close

        draw_dot(px, a_pos, hsv(hue))
        draw_dot(px, b_pos, hsv(hue + 128))

        for s in sparks:
            s[0] += s[1]
            s[1] *= 0.92
            s[2] *= 0.88
            draw_dot(px, s[0], (s[2], s[2] * 0.8, s[2] * 0.4))
        sparks = [s for s in sparks if s[2] > 6 and 0 <= s[0] < last]

        hue = (hue + 1) & 255
        yield


def heat_colour(heat):
    # 0-255 heat -> black / red / orange / yellow / white
    t192 = (heat * 191) >> 8
    ramp = (t192 & 63) << 2
    if t192 > 128:
        return (255, 255, ramp)
    if t192 > 64:
        return (255, ramp, 0)
    return (ramp, 0, 0)


def fire(px):
    # Classic "Fire2012" simulation: heat rises from LED 0 and cools as it goes
    cooling = (55 * 10) // NUM_LEDS + 2
    heat = [0] * NUM_LEDS
    while True:
        for i in range(NUM_LEDS):
            heat[i] = max(0, heat[i] - random.randint(0, cooling))
        for k in range(NUM_LEDS - 1, 1, -1):
            heat[k] = (heat[k - 1] + heat[k - 2] * 2) // 3
        if random.randint(0, 255) < 130:
            y = random.randint(0, 5)
            heat[y] = min(255, heat[y] + random.randint(160, 255))
        for i in range(NUM_LEDS):
            px[i] = heat_colour(heat[i])
        yield


def starfield(px):
    # Deep blue night sky that slowly shimmers, with stars that twinkle
    # in and out
    level = [0] * NUM_LEDS
    state = [0] * NUM_LEDS          # 0 = off, 1 = brightening, -1 = fading
    tint = [(0, 0)] * NUM_LEDS      # (hue, saturation) of each star
    t = 0
    while True:
        for i in range(NUM_LEDS):
            if state[i] == 0 and random.randint(0, 299) == 0:
                state[i] = 1
                tint[i] = random.choice(((0, 0), (0, 0), (150, 120),
                                         (35, 140), (200, 110)))
            elif state[i] == 1:
                level[i] = min(255, level[i] + 14)
                if level[i] == 255:
                    state[i] = -1
            elif state[i] == -1:
                level[i] = max(0, level[i] - 4)
                if level[i] == 0:
                    state[i] = 0

            bg = hsv(160 + (SIN8[(i * 12 + t) & 255] >> 3), 255,
                     45 + (SIN8[(i * 25 - t * 2) & 255] >> 4))
            star = hsv(tint[i][0], tint[i][1], level[i])
            px[i] = (max(bg[0], star[0]), max(bg[1], star[1]),
                     max(bg[2], star[2]))
        t += 1
        yield


def plasma(px):
    # Three interfering sine waves drive both colour and brightness
    t = 0
    while True:
        for i in range(NUM_LEDS):
            a = SIN8[(i * 16 + t * 2) & 255]
            b = SIN8[(t * 3 - i * 11 + 64) & 255]
            c = SIN8[(i * 7 - t + 128) & 255]
            px[i] = hsv(((a + b) >> 1) + t, 240, 120 + ((c * 135) >> 8))
        t += 1
        yield


def heartbeat(px):
    # "Lub-dub" pulses that ripple outward from the middle of the strip
    period = 55
    env = []
    for k in range(period):
        e = (255 * math.exp(-((k - 4) / 2.2) ** 2) +
             170 * math.exp(-((k - 14) / 2.8) ** 2))
        env.append(min(255, int(e)))
    centre = (NUM_LEDS - 1) / 2
    t = 0
    while True:
        for i in range(NUM_LEDS):
            d = abs(i - centre)
            v = max(55, env[(t - int(d * 1.5)) % period])
            px[i] = hsv(int(250 - d * 3) & 255, 230, v)
        t += 1
        yield


EFFECTS = [rainbow_glitter, twin_comets, fire, starfield, plasma, heartbeat]


# ---------------------------------------------------------------- main loop

next_frame = 0


def wait_frame():
    global next_frame
    next_frame = time.ticks_add(next_frame, FRAME_MS)
    delay = time.ticks_diff(next_frame, time.ticks_ms())
    if delay > 0:
        time.sleep_ms(delay)
    else:
        next_frame = time.ticks_ms()   # running behind, don't try to catch up


def start(effect):
    px = [BLACK] * NUM_LEDS
    return px, effect(px)


def play(px, gen, ms):
    end = time.ticks_add(time.ticks_ms(), ms)
    while time.ticks_diff(end, time.ticks_ms()) > 0:
        next(gen)
        show(px)
        wait_frame()


def crossfade(px, gen, new_px, new_gen):
    out = [BLACK] * NUM_LEDS
    for f in range(1, FADE_FRAMES + 1):
        next(gen)
        next(new_gen)
        t = f / FADE_FRAMES
        for i in range(NUM_LEDS):
            a = px[i]
            b = new_px[i]
            out[i] = (int(a[0] + (b[0] - a[0]) * t),
                      int(a[1] + (b[1] - a[1]) * t),
                      int(a[2] + (b[2] - a[2]) * t))
        show(out)
        wait_frame()


def light_show():
    global next_frame
    next_frame = time.ticks_ms()

    px, gen = start(power_up)
    play(px, gen, 2600)

    index = 0
    while True:
        new_px, new_gen = start(EFFECTS[index])
        crossfade(px, gen, new_px, new_gen)
        px, gen = new_px, new_gen
        play(px, gen, EFFECT_SECONDS * 1000)
        index = (index + 1) % len(EFFECTS)


try:
    light_show()
except KeyboardInterrupt:
    show([BLACK] * NUM_LEDS)
