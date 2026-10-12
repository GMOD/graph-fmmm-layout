import type { FmmmRequest, LayoutResult } from './types.ts'

export interface FmmmModule {
  computeLayout(
    graph: FmmmRequest['graph'],
    options: FmmmRequest['options'],
  ): LayoutResult
}

declare const createFmmmModule: () => Promise<FmmmModule>
export default createFmmmModule
