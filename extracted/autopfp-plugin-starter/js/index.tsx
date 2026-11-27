import { Design } from '@valenced/discord/design'


interface AutoPFPSettings {
  enabled: boolean
  query: string
  intervalMinutes: number
  avoidRepeats: boolean
}


const DEFAULT_SETTINGS: AutoPFPSettings = {
  enabled: false,
  query: 'Hunter x Hunter manga',
  intervalMinutes: 30,
  avoidRepeats: true,
}


export default plugin<{ jsonStorage: AutoPFPSettings }>({
  jsonStorage: {
    load: true,
    default: DEFAULT_SETTINGS,
    file: 'settings.json',
  },

  start({ logger, jsonStorage }) {
    logger.log('AutoPFP Rotator loaded. Rotation is not active yet; avatar update/search integration is pending verification.')
    // Next implementation step:
    // - add the image-search provider and candidate pool/cache
    // - download and automatically normalize images (square crop, resize, format)
    // - connect a verified Discord avatar-update action
    // - add lifecycle-safe rotation timer and manual Change Now action
    // Settings are stored persistently here, ready for the implementation.
    const settings = jsonStorage.cache ?? DEFAULT_SETTINGS
    logger.log(`Configured theme: ${settings.query}; interval: ${settings.intervalMinutes}m`)
  },

  SettingsComponent({ api }) {
    const { TableRowGroup, TableSwitchRow, Text } = Design
    const settings = api.jsonStorage.use() ?? DEFAULT_SETTINGS


    return (
      <TableRowGroup title="AutoPFP Rotator">
        <TableSwitchRow
          label="Enable rotation"
          subLabel="The automatic rotation engine is not wired up in this starter build yet."
          value={settings.enabled}
          onValueChange={(enabled: boolean) => api.jsonStorage.set({ ...settings, enabled })}
        />
        <Text>Search theme: {settings.query}</Text>
        <Text>Interval: {settings.intervalMinutes} minutes</Text>
        <Text>Repeat protection: {settings.avoidRepeats ? 'On' : 'Off'}</Text>
      </TableRowGroup>
    )
  },
})
