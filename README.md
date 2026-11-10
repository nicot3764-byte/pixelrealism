# Pixelrealism

A realistic pixel physics sandbox that runs in the browser: powders that pile and avalanche, water with real pressure and sloshing, fire and gas combustion, lava, structures that crack and collapse, and more.

Play: https://nicot3764-byte.github.io/pixelrealism/

Canvas size: click the existing **2x** button (or press **Shift+P**) and enter, for example, `1024 x 640`. On a phone, hold the existing portrait/landscape entry in the overflow menu. The size is saved on this device; changing it clears the scene. Enter `default` to reset. Dimensions must be even, 32–2048 per side, up to 1,048,576 pixels total. Invites carry the host's exact dimensions without replacing the guest's saved solo size.

Liquids have no fixed particle-count cap. Particle and separation buffers grow together as needed; available device memory and processing power determine practical scene size. The brush still spreads a pour across frames so one pointer event cannot flood the simulation with work.

Performance work preserves the menu HTML/CSS and the rendering style: empty background spans use a precomputed backdrop, heat diffusion skips exactly ambient rows, tight loops use local buffer references, and catch-up work is bounded so an overloaded or resumed tab remains responsive. The pressure-grid lookup uses 32-bit indices, including on large canvases. Under sustained overload, simulation time can advance more slowly than wall time instead of accumulating an unbounded backlog.

## Physics

Bodies and liquid push each other. A moving rigid body is a moving wall for the liquid solver, so a rock dropped into a pond opens a crater, throws up a crown of spray and sends waves out; what the liquid's pressure shows beyond the weight of still liquid pushes back on every wet face. That one mechanism gives the slap of a plank landing flat, the drag that sets how fast things sink (form drag grows with the square of the speed; lava and honey add their stickiness), jets that shove crates along the ground, and currents that carry what floats in them. A body can only hand the liquid as much motion as a collision with that much water allows, so a heavy rock ploughs on while a light plank all but stops at the surface. Flying grains give the liquid the momentum they lose in it. A resting body only yields to pressure that lasts, so one splash does not shift a dam, but a wave can finish a dam that was close to sliding.

Fire needs air. While something burns, the air is sorted into connected regions. The region that reaches the open top is the outside and never runs out. Any other region is a closed room with a fixed stock of oxygen that its fires use up; when about a third is gone the fire dies with fuel left, and the embers with it. Open the room and the air freshens within a second or two. The readout under the pointer shows the oxygen of used-up air (fresh air is 21 %). Thermite, gunpowder and TNT carry their own oxygen; burning gas is not limited.

Boiling takes heat. Water stays at 100 °C while the heat beyond that turns it into steam bit by bit, so a pot warms through before it boils dry, red-hot metal is quenched by a splash, and lava poured into a pool boils off about as much water as it weighs instead of the whole pool.

Metals conduct. Copper and steel get extra exchange rounds among themselves each tick, so a bar with one end in the fire is soon hot along its length while stone, glass and wood stay cool a short way from the flame.

Gravel now heaps like rubble instead of spreading into a pancake, and floating bodies sit in the surface that is drawn (the waterline is read at pixel, not solver-cell, resolution).

Development checks (Node.js with Playwright):

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
node tests/destruction.cjs
node tests/physics.cjs
node tests/benchmark.cjs
```

Use `CHROMIUM_PATH=/path/to/chromium` with an existing browser. Set `BASELINE_HTML=/path/to/previous/index.html` to compare exact heat diffusion and six rendered scenes against the previous version, verify that menu HTML/CSS are unchanged, and benchmark both versions. Benchmarks report CPU milliseconds per tick plus render at full quality; actual FPS depends on the device, scene and canvas size.

Physics regression checks (a few minutes) measure the splash of a dropped rock, floating depth, a plank landing flat, a jet against a crate, sinking through water and honey, a fire in a closed and in a vented box, a pot on a hot plate, lava poured into water and heat along a copper bar. With `BASELINE_HTML` set they print the same measurements for the older build. The baseline comparison in `tests/browser.cjs` still requires exact heat diffusion for everything except metals, and exact rendering.

Destruction regression checks cover repeated shattering, compact shard masks, rotated world-space placement and pixel coverage, and mass/inertia invalidation after erasing, changing material or chipping a moving body. Shards allocate only their occupied bounding rectangle; unchanged body masks reuse mass properties.
