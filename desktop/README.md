# PixelRealism for Windows

Run `PixelRealism-Windows-x64.exe`. It is a portable Windows 10/11 x64 application. No Node.js, web browser installation, developer tools or installer is required. F11 toggles fullscreen. The existing game controls, materials, menus, custom canvas sizes and online play remain available.

The game is based on `341c173d7b246c5fc226936e0f718aa5ec07dd19`, including the liquid-cap removal and repeated-breaking fixes. The original `index.html` stays unchanged. Desktop settings use their own persistent local profile. Multiplayer needs internet; solo play and the bundled PeerJS library are local. Invite links point to the existing public game so friends can join from a browser.

The application uses Electron with a sandboxed renderer and GPU acceleration enabled by default. It preserves the original JavaScript simulation and rendering, while three grid scans (gas activity, active thermal rows and column rendering data) are compiled from C to WebAssembly. Their arrays directly share the compiled module's memory, avoiding copies. Arithmetic precision and scan order are retained; no timesteps, pressure iterations, particle limits or visual effects are reduced. This is not a full C++ rewrite, and an EXE alone does not guarantee an FPS increase in every scene.

## Rebuild

```
npm ci
npm run desktop:portable
```

The portable executable is written to `artifacts/PixelRealism-Windows-x64.exe`. A conventional folder containing `PixelRealism.exe` is also available in `dist/PixelRealism-win32-x64/`. Keep the entire folder together when using that build.

`desktop/native/grid.wasm` is included so rebuilding the application does not require a C toolchain. To recompile the kernels, install wasi-sdk and run:

```
WASI_SDK_PATH=/path/to/wasi-sdk bash scripts/compile-grid.sh
```

The source uses no C runtime and compiles with `-O3 -ffp-contract=off -fno-fast-math`.

## Checks

```
npx playwright install chromium
npm test
npm run test:desktop
```

The desktop parity suite compares every rendered pixel and all tested simulation buffers byte for byte at twelve checkpoints across pond, empty, mixed chemistry and repeated-breaking scenes. It also exercises the actual Electron application, its sandbox, native canvas prompt, accept/cancel/reset, persisted dimensions/orientation, local PeerJS loading, public invite links and game controls. The existing regression suites cover over 100,000 liquid particles, heat/render parity and exact fragment geometry.

Tests of the application run on Linux with the headless Electron platform. The Windows PE executable is cross-packaged here; it still needs a run on a Windows machine for driver-specific FPS validation.

Measured headless CPU speedups in this environment were 1.140× for the starting pond, 1.024× for an empty canvas, 1.061× for 12,000 water particles and 1.009× after repeated breaking. These use unchanged full quality and a fixed tick plus render. See `performance.json` for the three-run measurements. Near-1% differences may be measurement noise; these are not measured Windows FPS gains.
