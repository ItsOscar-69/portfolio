"""Runs the real MicroPico boot.py under CPython with the hardware stubbed out, and records every frame it shows.

Usage: python tools/led-reference.py <path to boot.py> <seed> <frames> <out.json>   (or: npm run led:reference)
random is replaced by a mulberry32 stream defined exactly like src/lib/rng.js and src/lib/led/random.js, so the
JavaScript port fed the same seed must produce identical frames. The tests read the committed output; only
regenerating it needs Python.
"""
import hashlib
import json
import sys
import types

boot_path, seed, frame_count, out_path = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]


def mulberry32(seed):
    state = [seed & 0xFFFFFFFF]

    def imul(x, y):
        return (x * y) & 0xFFFFFFFF

    def nxt():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        a = state[0]
        t = imul(a ^ (a >> 15), 1 | a)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return nxt


draw = mulberry32(seed)
fake_random = types.ModuleType('random')
fake_random.randint = lambda a, b: a + int(draw() * (b - a + 1))
fake_random.uniform = lambda a, b: a + (b - a) * draw()
fake_random.choice = lambda seq: seq[int(draw() * len(seq))]

clock = [0]
fake_time = types.ModuleType('time')
fake_time.ticks_ms = lambda: clock[0]
fake_time.ticks_add = lambda a, b: a + b
fake_time.ticks_diff = lambda a, b: a - b


def sleep_ms(ms):
    clock[0] += ms


fake_time.sleep_ms = sleep_ms

machine = types.ModuleType('machine')
machine.Pin = lambda *args, **kwargs: None
rp2 = types.ModuleType('rp2')
rp2.PIO = types.SimpleNamespace(OUT_LOW=0, SHIFT_LEFT=0)
rp2.asm_pio = lambda **kwargs: (lambda fn: fn)


class StateMachine:
    def __init__(self, *args, **kwargs):
        pass

    def active(self, on):
        pass

    def put(self, words, shift):
        pass


rp2.StateMachine = StateMachine
sys.modules.update({'random': fake_random, 'time': fake_time, 'machine': machine, 'rp2': rp2})

# Run everything in boot.py except its final `try: light_show()`, then call light_show() with show() swapped for
# a recorder. Every line that draws a frame is boot.py's own.
source = open(boot_path, encoding='utf8').read()
cut = source.index('\ntry:\n    light_show()')
g = {'__name__': 'boot'}
exec(compile(source[:cut], 'boot.py', 'exec'), g)


class Done(Exception):
    pass


frames = []


def capture(px):
    frames.append([list(c) for c in px])
    if len(frames) >= frame_count:
        raise Done()


g['show'] = capture
try:
    g['light_show']()
except Done:
    pass

values = [v for f in frames for c in f for v in c]
non_int = sum(1 for v in values if not isinstance(v, int))
encode = lambda block: '\n'.join(';'.join(','.join(str(v) for v in c) for c in f) for f in block)
BLOCK = 50
blocks = [hashlib.sha256(encode(frames[i:i + BLOCK]).encode()).hexdigest()[:16] for i in range(0, len(frames), BLOCK)]
checkpoints = {str(i): frames[i] for i in (0, 27, 28, 40, 72, 129, 130, 155, 179, 180, 500, 929, 930, 1000, 1729, 1730, 1800, 2529, 2530, 2600, 3329, 3330, 3400, 4129, 4130, 4200, 4929, 4930, 5000)
               if i < len(frames)}
out = {
    'source': 'MicroPico/boot.py run under CPython by tools/led-reference.py',
    'seed': seed,
    'frames': len(frames),
    'blockSize': BLOCK,
    'blocks': blocks,
    'checkpoints': checkpoints,
    'sin8': list(g['SIN8']),
    'gamma': list(g['GAMMA']),
    'hsv': {f'{h},{s},{v}': list(g['hsv'](h, s, v)) for h, s, v in [(0, 255, 255), (42, 255, 255), (43, 255, 255), (85, 255, 255), (128, 255, 255), (170, 200, 180), (213, 255, 100), (255, 255, 255), (300, 255, 255), (-1, 255, 255), (10, 0, 77), (160, 255, 45)]},
}
json.dump(out, open(out_path, 'w'), separators=(',', ':'))
print(f'frames={len(frames)} non_int={non_int} min={min(values)} max={max(values)} clock_ms={clock[0]}')
print(f'negative values: {sum(1 for v in values if v < 0)}')
