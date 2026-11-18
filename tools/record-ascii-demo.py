"""Records the ASCII cyberpunk demo (raw/ascii/ascii_cyberpunk.py) headless for the portfolio.

Usage: py tools/record-ascii-demo.py <demo.py> <out dir> <frames> <fps>
SDL's dummy video driver means nothing is drawn on screen and the real mouse is never read: the figure follows a
scripted path, and every frame is saved as a PNG for tools/capture-ascii-demo.mjs to encode.
"""
import importlib.util
import math
import os
import random
import sys

os.environ["SDL_VIDEODRIVER"] = "dummy"
os.environ["SDL_AUDIODRIVER"] = "dummy"

demo_path, out_dir, frames, fps = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
random.seed(1)
spec = importlib.util.spec_from_file_location("ascii_demo", demo_path)
demo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(demo)  # defines App; the demo only runs itself under __main__

import pygame  # noqa: E402  (imported after the demo set it up with the dummy driver)


class SteadyClock:
    """Stands in for pygame's clock, so the HUD shows the frame rate the recording plays at."""

    def tick(self, *_):
        return 1000 / fps

    def get_fps(self):
        return float(fps)


SHRINK_STEPS = 5  # mouse-wheel notches down, so the figure fits the street with room around it
app = demo.App()
app.clock = SteadyClock()
app.show_help = False
for _ in range(SHRINK_STEPS):
    app.handle(pygame.event.Event(pygame.MOUSEWHEEL, x=0, y=-1, flipped=False, precise_x=0.0, precise_y=-1.0))
w, h = app.screen.get_size()
os.makedirs(out_dir, exist_ok=True)
dt = 1.0 / fps
for f in range(frames):
    t = f * dt
    x = w * (0.5 + 0.32 * math.sin(t * 0.55))  # the figure strolls left and right across the street
    y = h * (0.68 + 0.04 * math.sin(t * 1.3))
    app.handle(pygame.event.Event(pygame.MOUSEMOTION, pos=(int(x), int(y)), rel=(0, 0), buttons=(0, 0, 0)))
    app.update(dt)
    app.draw(dt)
    pygame.image.save(app.screen, os.path.join(out_dir, f"f{f:04d}.png"))
pygame.quit()
print(f"saved {frames} frames of {w}x{h}")
