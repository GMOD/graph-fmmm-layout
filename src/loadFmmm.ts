import type { FmmmModule } from './bandage-layout.js'

let cached: Promise<FmmmModule> | undefined

export function loadFmmm() {
  cached ??= import('./bandage-layout.js')
    .then(mod => mod.default())
    .catch((e: unknown) => {
      cached = undefined
      throw e
    })
  return cached
}
