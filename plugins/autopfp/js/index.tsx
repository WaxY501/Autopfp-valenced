import { pingNative } from './bridge.js'
import { startRestLookup } from './avatar.js'
import { diag } from './diag.js'
import { startRotationEngine } from './rotation.js'
import { SettingsScreen } from './settings.js'
import { DEFAULT_SETTINGS, type Settings } from './types.js'

export default plugin<{ jsonStorage: Settings }>({
	jsonStorage: { load: true, default: DEFAULT_SETTINGS, file: 'storage.json' },
	start({ cleanup, jsonStorage, logger }) {
		cleanup(startRestLookup(logger))
		cleanup(startRotationEngine({ storage: jsonStorage, logger }))
		void pingNative().then(r => {
			diag.native = r
			logger.log(`[AutoPFP] image engine: ${r}`)
		})
	},
	SettingsComponent({ api }) {
		return <SettingsScreen api={api} />
	},
})
