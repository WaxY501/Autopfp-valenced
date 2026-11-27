import { AutoPfpCore } from './core'

const autopfp = new AutoPfpCore()

export default plugin({
  start() {
    console.log('[AutoPFP] Core loaded')
    console.log('[AutoPFP] Image pool ready:', autopfp.size)
  },

  stop() {
    autopfp.stopRotation()
    console.log('[AutoPFP] Core stopped')
  }
})
