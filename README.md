# @jbrowse/graph-fmmm-layout

- **In:** a sequence graph (nodes with a length in bp, links between them), with
  optional start positions per node
- **Out:** a polyline per node, laid out by Bandage's force-directed engine

OGDF's fast multipole multilevel method (FMMM) in Bandage's port, compiled to
wasm and inlined into one ES module with no imports. The module loads on the
first call.

## Example

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

## Notes

- The layout is deterministic. `options.seed` overrides the fixed default.
- A node with `x`/`y` starts there and switches FMMM to keep positions. Pass
  `rotateComponents: false` with seeds.
- `pnpm build:wasm` rebuilds the committed `src/bandage-layout.js` from
  `native/` and the vendored OGDF; it needs only the Emscripten SDK. See
  [`native/README.md`](native/README.md).
- GPL-3.0-or-later, because Bandage and OGDF are GPL.

## See also

- [@jbrowse/graph-stress-layout](https://github.com/GMOD/graph-stress-layout) -
  the plain-JS stress layout
- [@jbrowse/bandage-core](https://github.com/GMOD/bandage-core) - Bandage
  drawing engine that uses both
