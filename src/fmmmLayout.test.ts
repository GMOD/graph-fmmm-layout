import { expect, it } from 'vitest'

import { fmmmLayout } from './fmmmLayout.ts'

import type { FmmmRequest } from './types.ts'

it('lays out every node of a bubble', async () => {
  const ids = ['a+', 'b+', 'c+', 'd+']
  const { nodePositions } = await fmmmLayout({
    graph: {
      nodes: ids.map(id => ({ id, length: 100 })),
      edges: [
        { from: 'a+', to: 'b+' },
        { from: 'a+', to: 'c+' },
        { from: 'b+', to: 'd+' },
        { from: 'c+', to: 'd+' },
      ],
    },
    options: { quality: 1, linearLayout: false },
  })
  expect(Object.keys(nodePositions).sort()).toEqual(ids)
  for (const points of Object.values(nodePositions)) {
    expect(
      points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)),
    ).toBe(true)
  }
})

const orderGraph: FmmmRequest['graph'] = {
  nodes: ['a+', 'b+', 'c+', 'd+', 'e+'].map(id => ({ id, length: 1000 })),
  edges: [
    { from: 'a+', to: 'b+' },
    { from: 'a+', to: 'c+', toStrand: '-' },
    { from: 'b+', to: 'd+' },
    { from: 'c+', fromStrand: '-', to: 'd+' },
    { from: 'd+', to: 'e+' },
  ],
}

async function drawInOrder(
  linearLayout: boolean,
  { nodes, edges } = orderGraph,
) {
  const { nodePositions } = await fmmmLayout({
    graph: { nodes, edges },
    options: { quality: 1, linearLayout },
  })
  return JSON.stringify(
    Object.keys(nodePositions)
      .sort()
      .map(id => [id, nodePositions[id]]),
  )
}

const reversedNodes = {
  ...orderGraph,
  nodes: orderGraph.nodes.toReversed(),
}
const reversedEdges = {
  ...orderGraph,
  edges: orderGraph.edges.toReversed(),
}

it('draws one input order the same every time', async () => {
  for (const linearLayout of [false, true]) {
    expect(await drawInOrder(linearLayout)).toBe(
      await drawInOrder(linearLayout),
    )
  }
})

it('draws the force layout differently when the nodes or the edges are reversed', async () => {
  const layout = await drawInOrder(false)
  expect(await drawInOrder(false, reversedNodes)).not.toBe(layout)
  expect(await drawInOrder(false, reversedEdges)).not.toBe(layout)
})

it('sorts the nodes for the linear layout, but not the edges', async () => {
  const layout = await drawInOrder(true)
  expect(await drawInOrder(true, reversedNodes)).toBe(layout)
  expect(await drawInOrder(true, reversedEdges)).not.toBe(layout)
})
