#!/usr/bin/env bash
set -euo pipefail
: "${WASI_SDK_PATH:?Set WASI_SDK_PATH to your wasi-sdk folder}"
"$WASI_SDK_PATH/bin/clang" desktop/native/grid.c --target=wasm32 -O3 -ffp-contract=off -fno-fast-math -fno-builtin -nostdlib -Wl,--no-entry -Wl,--import-memory -Wl,-z,stack-size=32768 -Wl,--initial-memory=131072 -o desktop/native/grid.wasm
