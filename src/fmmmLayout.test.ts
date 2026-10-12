import { expect, it } from 'vitest'

import { fmmmLayout } from './fmmmLayout.ts'

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
