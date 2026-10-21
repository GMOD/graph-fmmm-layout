# @jbrowse/graph-fmmm-layout

`fmmmLayout` lays out a sequence graph with Bandage's port of OGDF's fast
multipole multilevel method (FMMM). The engine is compiled to wasm and inlined
into one ES module with no imports (`src/bandage-layout.js`), which `fmmmLayout`
loads on its first call.

## Usage

```bash
npm install @jbrowse/graph-fmmm-layout
```

```ts
import { fmmmLayout } from '@jbrowse/graph-fmmm-layout'

const { nodePositions } = await fmmmLayout({
  graph: {
    nodes: [
      { id: 'a+', length: 1200 },
      { id: 'b+', length: 800 },
      { id: 'c+', length: 5000 },
    ],
    edges: [
      { from: 'a+', to: 'b+' },
      { from: 'a+', to: 'c+' },
      { from: 'c+', to: 'b+' },
    ],
  },
  options: {
    quality: 2,
    nodeLengthPerMegabase: 20_000,
    minimumNodeLength: 5,
    nodeSegmentLength: 10,
    edgeLength: 5,
  },
})
```

- Each node has a `length` in bp, and `nodePositions` holds a polyline of
  `{ x, y }` points per node id
- An edge leaves the end of `from` and enters the start of `to`. `fromStrand`
  and `toStrand` (`'+'` or `'-'`) pick the other end when they disagree with the
  `+` or `-` that ends the node id
- `options` also takes `linearLayout`, `aspectRatio`, `componentSeparation`,
  `rotateComponents` and `seed`. The layout is deterministic, and `seed`
  replaces the fixed default
- A node with `x`/`y` starts there, and the engine switches FMMM to keep
  positions. Pass `rotateComponents: false` with seeds
- `pnpm build:wasm` rebuilds the committed `src/bandage-layout.js` from
  `native/` and the vendored OGDF, and needs only the Emscripten SDK. See
  [`native/README.md`](native/README.md)

The license is GPL-3.0-or-later, because Bandage and OGDF are GPL.

## See also

- [@jbrowse/graph-stress-layout](https://github.com/GMOD/graph-stress-layout) -
  the plain-JS stress layout
- [@jbrowse/bandage-core](https://github.com/GMOD/bandage-core) - Bandage
  drawing engine that uses both
