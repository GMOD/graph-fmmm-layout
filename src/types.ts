// `length` is in bp, drawn at the request's `nodeLengthPerMegabase`. An
// optional `x`/`y` is where the node's chain starts: a graph with any seed runs
// FMMM from those positions instead of a random placement.
export interface FmmmNode {
  id: string
  length: number
  x?: number
  y?: number
}

// A link leaves the END of `from` read `fromStrand` and arrives at the START of
// `to` read `toStrand`. An id ending in `+` or `-` is a node read that way, so a
// strand that disagrees with it enters the other side.
export interface FmmmEdge {
  from: string
  to: string
  fromStrand?: '+' | '-'
  toStrand?: '+' | '-'
}

// `options` carries `quality` (0-4), `linearLayout`, `seed`, `aspectRatio`,
// `componentSeparation`, `rotateComponents` and the drawn scale
// (`nodeLengthPerMegabase`, `minimumNodeLength`, `nodeSegmentLength`,
// `edgeLength`). Send `rotateComponents: false` with seeds, or FMMM turns each
// component away from the orientation they state.
export interface FmmmRequest {
  graph: {
    nodes: FmmmNode[]
    edges: FmmmEdge[]
  }
  options: Record<string, unknown>
}

export interface NodeSegment {
  x: number
  y: number
}

export interface LayoutResult {
  nodePositions: Record<string, NodeSegment[]>
}
