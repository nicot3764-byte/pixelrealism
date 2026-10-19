# Pixelrealism

A realistic pixel physics sandbox that runs in the browser: powders that pile and avalanche, water with real pressure and sloshing, fire and gas combustion, lava, structures that crack and collapse, and more.

Play: https://nicot3764-byte.github.io/pixelrealism/

Canvas size: click the existing **2x** button (or press **Shift+P**) and enter, for example, `1024 x 640`. On a phone, hold the existing portrait/landscape entry in the overflow menu. The size is saved on this device; changing it clears the scene. Enter `default` to reset. Dimensions must be even, 32–2048 per side, up to 1,048,576 pixels total. Invites carry the host's exact dimensions without replacing the guest's saved solo size.

Liquids have no fixed particle-count cap. Particle and separation buffers grow together as needed; available device memory and processing power determine practical scene size. The brush still spreads a pour across frames so one pointer event cannot flood the simulation with work.

Performance work preserves the menu HTML/CSS and the rendering style: empty background spans use a precomputed backdrop, heat diffusion skips exactly ambient rows, tight loops use local buffer references, and catch-up work is bounded so an overloaded or resumed tab remains responsive. The pressure-grid lookup uses 32-bit indices, including on large canvases. Under sustained overload, simulation time can advance more slowly than wall time instead of accumulating an unbounded backlog.

Development checks (Node.js with Playwright):

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
node tests/benchmark.cjs
```

Use `CHROMIUM_PATH=/path/to/chromium` with an existing browser. Set `BASELINE_HTML=/path/to/previous/index.html` to compare exact heat diffusion and six rendered scenes against the previous version, verify that menu HTML/CSS are unchanged, and benchmark both versions. Benchmarks report CPU milliseconds per tick plus render at full quality; actual FPS depends on the device, scene and canvas size.
