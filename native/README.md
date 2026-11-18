# Bandage layout engine

- `native/` holds the C++ port of Bandage's FMMM layout (OGDF), about 900 lines:
  the graph model, the OGDF wiring and the Emscripten bindings. We keep it in
  this repo rather than a BandageNG checkout so that a change to the layout is a
  reviewable diff here. The port started in
  https://github.com/cmdcolin/BandageNG-web (`bandage-layout-js/`). See
  [Differences from BandageNG](#differences-from-bandageng)
- `vendor/ogdf` holds OGDF `elderberry-202309` with
  `vendor/ogdf-emscripten.patch` applied. See [Vendored OGDF](#vendored-ogdf)

## Differences from BandageNG

The layout comes from `layout/graphlayoutworker.cpp` in
<https://github.com/asl/BandageNG>, which has not changed since 2024-07-31
(checked against v2026.9.1). `native/src/graphlayout.cpp` keeps its structure
and function names, so the two files diff side by side. `configure` is
BandageNG's `FMMGraphLayout::init`, and BandageNG's
`calculateBoundingRectanglesOfComponents`, dead behind `#if 0`, is gone. The
FMMM quality presets, the component rotation and the MAAR packing are unchanged.
FMMM drops self-loops and merges parallel edges, so which of those each side
adds (a hairpin on a one-segment node, BandageNG's reverse-complement edges in
double mode) does not move the layout. Everything else that differs is listed
here.

### Changed behavior

- **Deterministic seed.** BandageNG seeds FMMM from `clock()` with
  `InitialPlacementForces::RandomTime`, so each force-directed run draws a
  different picture. We seed from `LayoutSettings::randomSeed` (default 1,
  option `seed`) with `RandomRandIterNr`, which is the placement mode that reads
  the seed
- **Strands.** BandageNG holds two nodes per segment (`1+` and `1-`), lays out
  one of each pair and gives the other the same points reversed. An edge from a
  node that was not laid out attaches to its reverse complement's other end. We
  hold one node per id the caller sends and return points only for those ids. An
  edge's `fromStrand`/`toStrand` pick the end instead (`leavesStart` and
  `entersEnd` in `graph.h`). The linear layout reads them too, and starts a node
  to the right of the nodes whose end joins its start, which are the upstream
  nodes of `N+` that BandageNG lays out. An id that does not end in `+` or `-`
  ignores the strands. See [Seeds and strands](#seeds-and-strands)
- **Linear layout sort.** BandageNG sorts numerically only when every name is a
  number; one non-numeric name sorts the whole graph alphabetically,
  case-insensitively and locale-aware, so `10` lands before `9`. We sort the
  numeric names numerically first, then the rest by byte order (case-sensitive),
  with a stable sort. Both strip the last character of the id before sorting,
  even from an id with no sign
- **Order.** We build the OGDF graph and return nodes in input order, and the
  order moves the layout: the same graph with its nodes or its edges reversed
  lays out differently. The linear layout sorts the nodes, so only its edge
  order counts, unless two ids differ only in their last character. bandage-core
  sorts edges for this (`canonicalEdgeOrder`). BandageNG builds from a hat-trie
  of nodes and a hash set of edge pointers, and returns nodes in hash-map order.
  `src/fmmmLayout.test.ts` and the `rev nodes` and `rev edges` rows of
  `scripts/layout-digest.mjs` pin this

### Added

- **Seeds.** A node with `x`/`y` starts its chain there, and any seed switches
  FMMM to `KeepPositions`. BandageNG uses `KeepPositions` only for the linear
  layout. Unseeded nodes in a seeded graph start at the origin, and the linear
  layout ignores seeds
- **`rotateComponents: false`.** Turns off FMMM's 50-step component rotation and
  its tip-over, skips the rotation in `reassembleDrawings`, and packs with
  `TipOver::None`. BandageNG always rotates

### Removed

- **Qt.** No `QtConcurrent`: components are laid out one after another on one
  thread, where BandageNG runs one task per component. No cancel. Points are a
  plain `Point`, not `QPointF`
- **Global settings.** BandageNG reads `g_settings`; we take a `LayoutSettings`
  per call, and the caller computes `nodeLengthPerMegabase`
- **Filtering.** BandageNG skips nodes and edges that are not drawn, and edges
  of type `JUMP` or `EXTRA_LINK`. We lay out every node and edge we are given,
  so the caller filters. An edge naming an unknown id is dropped, and a repeated
  id replaces the earlier node

### Defaults

BandageNG's defaults come from `program/settings.cpp`. bandage-core passes its
own value for every setting here but `aspectRatio` (`engineRequest` in
`pipeline.ts`). With its defaults, that matches BandageNG except for
`componentSeparation`, and it derives `nodeLengthPerMegabase` with the same auto
rule as BandageNG (`layout/drawnScale.ts`). Its other `bubbleSpread` values,
which a caller must ask for, replace that rule with a power law, so drawn node
length is no longer proportional to bp.

| Setting                 | BandageNG                                           | here     | bandage-core             |
| ----------------------- | --------------------------------------------------- | -------- | ------------------------ |
| `quality`               | 2                                                   | 1        | 2                        |
| `nodeLengthPerMegabase` | auto: mean drawn node length 40, total at least 500 | 1000     | BandageNG's auto         |
| `minimumNodeLength`     | 5                                                   | 1        | 5                        |
| `edgeLength`            | 5                                                   | 1        | 5 × `spacing`, default 1 |
| `nodeSegmentLength`     | 20                                                  | 1        | 20                       |
| `componentSeparation`   | 50                                                  | 15       | 15                       |
| `aspectRatio`           | the view's width / height (GUI), 1.333333 (CLI)     | 1.333333 | not sent: 1.333333       |

## Rebuilding `src/bandage-layout.js`

`pnpm build:wasm` (`scripts/build-wasm.sh`) compiles `native/` with
`-sSINGLE_FILE=1`, which embeds the wasm as base64. The output,
`src/bandage-layout.js`, is a self-contained ES module with no imports, so
esbuild leaves it alone and a consumer can load it as a lazy chunk.

- The build needs the Emscripten SDK installed and downloads nothing. It
  compiles the vendored OGDF to `libOGDF.a` and links the engine against it
- A build from scratch takes about four minutes on 16 cores, and seconds once
  `libOGDF.a` exists. The script rebuilds `libOGDF.a` only when it is missing or
  its compiler flags changed
- `OGDF_DIR` points the script at another OGDF tree, for testing an upstream
  bump
- `pnpm build` needs no OGDF, because it copies the committed engine
- On 2026-08-13, rebuilding OGDF under emcc 6.0.6 in place of a `libOGDF.a` from
  October 2025 moved no coordinate in any of the 90 cases of
  `scripts/layout-digest.mjs`. Run the digest to check again

## `pnpm test:wasm`

`scripts/smoke-wasm.mjs` loads the committed artifact and lays out small graphs.
It checks that:

- The file runs, since a reformatter such as `oxlint --fix` or oxfmt corrupts
  its minified glue
- The layout is deterministic, with the seed fixed at
  `LayoutSettings::randomSeed` and overridable per call by the `seed` option.
  Upstream FMMM seeded its initial placement from `clock()`, which moved about
  2% of the pixels in every force-directed screenshot between regens
- The linear layout draws a graph whose segment names are not integers, such as
  a minigraph rGFA's `s1`. `determineLinearNodePositions` is the only code that
  reads a segment's name, and only `linearLayout` reaches it. See
  `parseWholeInt` in `native/include/types.h`

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

- `layout-digest.mjs` hashes full-precision coordinates over six graph shapes
  and every option the view sends. A change meant to move nothing gives an empty
  diff, and each changed line is a figure to regenerate
- `.github/workflows/wasm-rebuild.yml` runs this every Monday and writes the
  diff to the job summary. Both scripts run on bare node, with no `pnpm install`
- On one host with one Emscripten, the build is byte-reproducible: Emscripten
  does not embed the build path. A regen from a worktree on 2026-08-13 left
  `git status` clean against an artifact built in the primary checkout. An
  unchanged `bandage-layout.js` therefore confirms a no-op change, and the
  digest covers a change that moves bytes and a bump of Emscripten

## Seeds and strands

The engine reads a node's `x`/`y` as where its chain starts (`addToOgdfGraph`)
and switches FMMM to `KeepPositions`. bandage-core's `layout/referenceSeeds.ts`
uses this to lay a reference backbone along x with the alleles under their
anchors. Its `layout/archSeeds.ts` then lifts a reference stretch that two links
join to the reference beside it by like ends, as at an inversion, onto a shallow
arch, so FMMM does not start that stretch's loop lying across the reference.
BandageNG seeds nothing, so where these seeds apply its picture differs from
ours.

- Send `rotateComponents: false` with seeds, because FMMM otherwise turns each
  component to the angle of least area and packing may tip it a further 90
  degrees. With the option off, FMMM still packs the components
- In `layout-digest.mjs`, the `seeded` rows pass seeds with
  `rotateComponents: false`, and the other rows pass neither
- The graph holds one node per segment, so `L a + b -` reaches the end of `b+`.
  bandage-core's `mergeRuns` counts links per side for the same reason

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
the same fix for `<chrono>` (hunk 2 of the patch). To check in seconds, with no
native OGDF:

```console
g++ -fsyntax-only -Ivendor/ogdf/include -Ivendor/ogdf/build-wasm/include native/src/graphlayout.cpp
```

## Vendored OGDF

`vendor/ogdf` holds OGDF, the library FMMM comes from, at upstream tag
`elderberry-202309` of <https://github.com/ogdf/ogdf> with
`vendor/ogdf-emscripten.patch` already applied.

- With OGDF vendored, the build needs only this repo and the Emscripten SDK, and
  builds against a known OGDF version. The tree takes 26 MB on disk and about 4
  MB in a clone
- `package.json` publishes only `esm/`, so `vendor/` is not in the npm tarball
- OGDF is GPL (`vendor/ogdf/LICENSE_GPL_v2.txt`,
  `vendor/ogdf/LICENSE_GPL_v3.txt`), so this package is GPL-3.0-or-later

### The patch

A stock `elderberry-202309` does not build for wasm. OGDF adds `-march=native`
for any compiler that identifies as GNU or Clang, and emcc is Clang:

```
clang++: error: unsupported option '-march=' for target 'wasm32-unknown-emscripten'
```

- Hunk 1 drops Clang from that guard. A committed artifact needs it dropped
  anyway, because `-march=native` targets whichever CPU ran the build
- Hunk 2 adds a `<chrono>` include that newer libc++ no longer provides
  transitively
- BandageNG's vendored OGDF has the same two hunks. Upstream `elderberry-202309`
  plus this patch reproduced all 90 cases of `scripts/layout-digest.mjs` with
  byte-identical coordinates against the artifact built from BandageNG's tree,
  so the two hunks are the whole difference that affects the layout

### Re-syncing to a newer OGDF

```console
git clone --depth 1 --branch <newtag> https://github.com/ogdf/ogdf.git /tmp/ogdf
patch -p1 --fuzz=0 -d /tmp/ogdf < vendor/ogdf-emscripten.patch   # may need rework
rm -rf /tmp/ogdf/.git && rm -rf vendor/ogdf && mv /tmp/ogdf vendor/ogdf
pnpm build:wasm
```

Then diff the drawing as in [Verifying a rebuild](#verifying-a-rebuild). A
different OGDF has a different FMMM, so expect every force-directed figure to
move and need regenerating. Commit the bump on its own.
