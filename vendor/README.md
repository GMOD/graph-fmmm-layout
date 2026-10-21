# Vendored third-party sources

## `ogdf/`: OGDF `elderberry-202309`, patched

`native/` is a port of Bandage's FMMM layout, and FMMM is part of OGDF.
`scripts/build-wasm.sh` compiles this tree to `libOGDF.a` with Emscripten and
links the engine against it.

- Upstream is <https://github.com/ogdf/ogdf> at tag `elderberry-202309`, with
  `ogdf-emscripten.patch` beside this file already applied
- With OGDF vendored, `pnpm build:wasm` needs only this repo and the Emscripten
  SDK, downloads nothing, and builds against a known OGDF version. The tree
  takes 26 MB on disk and about 4 MB in a clone
- `pnpm build` needs none of this tree, because it copies the committed engine
  at `src/bandage-layout.js`
- `package.json` publishes only `esm/`, so this directory is not in the npm
  tarball

## The patch

A stock `elderberry-202309` does not build for wasm. OGDF adds `-march=native`
for any compiler that identifies as GNU or Clang, and emcc is Clang:

```
clang++: error: unsupported option '-march=' for target 'wasm32-unknown-emscripten'
```

- Hunk 1 drops Clang from that guard. A committed artifact needs it dropped
  anyway, because `-march=native` targets whichever CPU ran the build
- Hunk 2 adds a `<chrono>` include that newer libc++ no longer provides
  transitively

BandageNG's vendored OGDF has the same two hunks. Upstream `elderberry-202309`
plus this patch reproduced all 90 cases of `scripts/layout-digest.mjs` with
byte-identical coordinates against the artifact built from BandageNG's tree, so
the two hunks are the whole difference that affects the layout.

## Re-syncing to a newer OGDF

```console
git clone --depth 1 --branch <newtag> https://github.com/ogdf/ogdf.git /tmp/ogdf
patch -p1 --fuzz=0 -d /tmp/ogdf < vendor/ogdf-emscripten.patch   # may need rework
rm -rf /tmp/ogdf/.git && rm -rf vendor/ogdf && mv /tmp/ogdf vendor/ogdf
pnpm build:wasm
```

Then diff the drawing with the `layout-digest.mjs` recipe in
[`native/README.md`](../native/README.md#verifying-a-rebuild). A different OGDF
has a different FMMM, so expect every force-directed figure to move and need
regenerating. Commit the bump on its own.

## License

OGDF is GPL (`ogdf/LICENSE_GPL_v2.txt`, `ogdf/LICENSE_GPL_v3.txt`), so this
package is GPL-3.0-or-later.
