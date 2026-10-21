# Bandage layout engine

`native/` holds the C++ port of Bandage's FMMM layout (OGDF), about 900 lines:
the graph model, the OGDF wiring and the Emscripten bindings. We keep it in this
repo rather than a BandageNG checkout so that a change to the layout is a
reviewable diff here. Upstream is https://github.com/cmdcolin/BandageNG-web
(`bandage-layout-js/`).

## Rebuilding `src/bandage-layout.js`

`pnpm build:wasm` (`scripts/build-wasm.sh`) compiles `native/` with
`-sSINGLE_FILE=1`, which embeds the wasm as base64. The output,
`src/bandage-layout.js`, is a self-contained ES module with no imports, so
esbuild leaves it alone and a consumer can load it as a lazy chunk.

- The Emscripten SDK is the only install. OGDF is vendored at `vendor/ogdf`
  (`elderberry-202309`, patched; see [`vendor/README.md`](../vendor/README.md)),
  so the build needs no network
- A build from scratch takes about four minutes on 16 cores, and seconds once
  `libOGDF.a` exists. The script rebuilds `libOGDF.a` only when it is missing or
  its compiler flags changed
- `OGDF_DIR` points the script at another OGDF tree, for testing an upstream
  bump
- On 2026-08-13, rebuilding OGDF under emcc 6.0.6 in place of a `libOGDF.a` from
  October 2025 moved no coordinate in any of the 90 cases of
  `scripts/layout-digest.mjs`. Run the digest to check again

## `pnpm test:wasm`

`scripts/smoke-wasm.mjs` loads the committed artifact and lays out small graphs.
It checks that:

- The file runs, since a reformatter such as `eslint --fix` or prettier corrupts
  its minified glue
- The layout is deterministic, with the seed fixed at
  `LayoutSettings::randomSeed` and overridable per call by the `seed` option.
  Upstream FMMM seeded its initial placement from `clock()`, which moved about
  2% of the pixels in every force-directed screenshot between regens
- The linear layout draws a graph whose segment names are not integers, such as
  a minigraph rGFA's `s1`. `determineLinearNodePositions` is the only code that
  reads a segment's name, and only `linearLayout` reaches it. See
  `parseWholeInt` in `native/include/types.h`

## Seeds and strands

The engine reads a node's `x`/`y` as where its chain starts (`addToOgdfGraph`)
and switches FMMM to `KeepPositions`. bandage-core's `layout/referenceSeeds.ts`
uses this to lay a reference backbone along x with the alleles under their
anchors. Send `rotateComponents: false` with seeds, because FMMM otherwise turns
each component to the angle of least area and packing may tip it a further 90
degrees. With the option off, FMMM still packs the components. In
`layout-digest.mjs`, the `seeded` rows pass seeds with
`rotateComponents: false`, and the other rows pass neither.

An edge's `fromStrand`/`toStrand` pick the ends it joins. The graph holds one
node per segment, so `L a + b -` reaches the end of `b+`. The engine reads a
strand against the `+` or `-` that ends the node id, and an edge with no strand
joins the end of `from` to the start of `to`. bandage-core's `mergeRuns` counts
links per side for the same reason.

## No code in `native/` may throw

Emscripten builds with exception catching off by default, so a `throw` calls
`abort()`, even inside a `try` with a `catch (...)`, because the compiler
removes the handler. A `std::stoi` wrapped in that `try` aborted the module on
every graph whose segments were named `s1`.

An aborted call leaks what it allocated, and bandage-core's `loadBandage()`
caches one module per worker. After about twenty aborted calls, every later
layout fails with "memory access out of bounds" until the tab is reloaded. The
code owns its allocations through `std::unique_ptr` rather than matched
`new`/`delete`, so a future throw leaks less.

## Include every header a file uses

emcc's libc++ includes `<cmath>` transitively, and libstdc++ does not.
`settings.h` called `ceil()` without `<cmath>` and compiled under emcc, until
`scripts/profile/` compiled the same sources with g++. The vendored OGDF needed
the same fix for `<chrono>` (hunk 2 of `vendor/ogdf-emscripten.patch`). To check
in seconds, with no native OGDF:

```console
g++ -fsyntax-only -Ivendor/ogdf/include -Ivendor/ogdf/build-wasm/include native/src/graphlayout.cpp
```

## Verifying a rebuild

A different Emscripten or build host changes the artifact's bytes without
changing the layout, so compare the drawing instead:

```console
git show HEAD:src/bandage-layout.js > /tmp/old-engine.mjs
node scripts/layout-digest.mjs /tmp/old-engine.mjs > /tmp/before.txt
pnpm build:wasm
node scripts/layout-digest.mjs > /tmp/after.txt
diff /tmp/before.txt /tmp/after.txt
```

- `layout-digest.mjs` hashes full-precision coordinates over five graph shapes
  and every option the view sends. A change meant to move nothing gives an empty
  diff, and each changed line is a figure to regenerate
- `.github/workflows/wasm-rebuild.yml` runs this every Monday and writes the
  diff to the job summary. Both scripts run on bare node, with no `pnpm install`
- On one host with one Emscripten, the build is byte-reproducible: Emscripten
  does not embed the build path. A regen from a worktree on 2026-08-13 left
  `git status` clean against an artifact built in the primary checkout. An
  unchanged `bandage-layout.js` therefore confirms a no-op change, and the
  digest covers a change that moves bytes and a bump of Emscripten
