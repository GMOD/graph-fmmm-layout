import { loadFmmm } from './loadFmmm.ts'

import type { FmmmRequest, LayoutResult } from './types.ts'

export async function fmmmLayout(request: FmmmRequest): Promise<LayoutResult> {
  const engine = await loadFmmm()
  return engine.computeLayout(request.graph, request.options)
}
