import AutoPfpSettings from './settings'
import { AutoPfpCore } from './core'


const autopfp = new AutoPfpCore()


export default plugin({
  SettingsComponent: AutoPfpSettings,
  start() {
    console.log('[AutoPFP] Settings UI stage loaded')
    console.log('[AutoPFP] Rotation core ready:', autopfp.size)
  },
  stop() {
    autopfp.stopRotation()
    console.log('[AutoPFP] Plugin stopped')
  },
})
