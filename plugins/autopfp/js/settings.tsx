import React, { useEffect, useState } from 'react'
import { Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { activeCollection, addImageTo, clampInterval, newId, normalize, removeImageFrom } from './core.js'
import { diag } from './diag.js'
import { searchImages } from './imageSearch.js'
import { changeNow, nextChangeText } from './rotation.js'
import { DEFAULT_SETTINGS, MIN_INTERVAL_MIN, type FitMode, type OrderMode, type PfpImage, type SearchImage, type Settings } from './types.js'

const s: any = {
	root: { padding: 16, gap: 12 },
	title: { fontSize: 18, fontWeight: '700', marginTop: 10 },
	hint: { opacity: 0.7 },
	row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	field: { borderWidth: 1, borderColor: '#77777755', borderRadius: 8, padding: 10, flexGrow: 1, flexShrink: 1, minWidth: 120 },
	chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#77777755' },
	chipOn: { backgroundColor: '#5865f2', borderColor: '#5865f2' },
	btn: { backgroundColor: '#5865f2', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8 },
	btnMuted: { backgroundColor: '#6d6f78' },
	btnText: { color: 'white', fontWeight: '600' },
	card: { width: 128, gap: 6 },
	thumb: { width: 128, height: 128, borderRadius: 10, backgroundColor: '#77777733' },
	step: { backgroundColor: '#5865f2', width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
}

function Btn({ label, onPress, muted }: { label: string; onPress: () => void; muted?: boolean }) {
	return (
		<Pressable style={[s.btn, muted && s.btnMuted]} onPress={onPress}>
			<Text style={s.btnText}>{label}</Text>
		</Pressable>
	)
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
	return (
		<Pressable style={[s.chip, on && s.chipOn]} onPress={onPress}>
			<Text style={on ? { color: 'white', fontWeight: '600' } : undefined}>{label}</Text>
		</Pressable>
	)
}

export function SettingsScreen({ api }: { api: any }) {
	const storage = api.jsonStorage
	const data: Settings = normalize(storage.use())
	const col = activeCollection(data)

	/** Always reads the newest stored value, so a background change is never overwritten with an old copy. */
	const commit = (patch: Partial<Settings>) => {
		void storage.set({ ...normalize(storage.cache), ...patch }, true)
	}

	const [, setTick] = useState(0)
	useEffect(() => {
		const t = setInterval(() => setTick(n => n + 1), 1000)
		return () => clearInterval(t)
	}, [])

	const [query, setQuery] = useState('')
	const [results, setResults] = useState<SearchImage[]>([])
	const [url, setUrl] = useState('')
	const [newName, setNewName] = useState('')
	const [msg, setMsg] = useState('')
	const [busy, setBusy] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)

	function updateActive(next: typeof col) {
		commit({ collections: data.collections.map(c => (c.id === next.id ? next : c)) })
	}

	function addToActive(imageUrl: string, title?: string) {
		const r = addImageTo(col, imageUrl, title)
		if (!r.added) return setMsg(r.reason ?? 'Could not add.')
		updateActive(r.collection)
		setMsg(`Added to "${col.name}".`)
	}

	async function doSearch() {
		setBusy(true)
		setMsg('Searching Wikimedia Commons\u2026')
		try {
			const found = await searchImages(query)
			setResults(found)
			setMsg(found.length ? `${found.length} results.` : 'No results. Try another word.')
		} catch (e: any) {
			setMsg(String(e?.message ?? e))
		} finally {
			setBusy(false)
		}
	}

	function createCollection() {
		const name = newName.trim()
		if (!name) return setMsg('Type a name first.')
		const id = newId()
		commit({ collections: [...data.collections, { id, name, images: [] }], activeId: id })
		setNewName('')
		setMsg(`Created "${name}".`)
	}

	function deleteCollection() {
		if (data.collections.length < 2) return setMsg('You need at least one collection.')
		if (!confirmDelete) {
			setConfirmDelete(true)
			return setMsg(`Tap Delete again to remove "${col.name}" and its ${col.images.length} images.`)
		}
		const rest = data.collections.filter(c => c.id !== col.id)
		commit({ collections: rest, activeId: rest[0].id, state: { ...data.state, cursor: 0 } })
		setConfirmDelete(false)
		setMsg('Collection deleted.')
	}

	async function useNow(image?: PfpImage) {
		setBusy(true)
		setMsg(await changeNow(image))
		setBusy(false)
	}

	return (
		<ScrollView>
			<View style={s.root}>
				<Text style={s.title}>AutoPFP Rotator</Text>
				<Text style={s.hint}>
					{[
						`Image engine: ${diag.native}`,
						`Discord requests: ${diag.rest}`,
						nextChangeText(data),
						`Last: ${diag.lastResult}`,
					].join('\n')}
				</Text>

				<View style={s.row}>
					<Text style={{ flex: 1 }}>Rotate my profile picture automatically</Text>
					<Switch value={data.rotating} onValueChange={v => commit({ rotating: v })} />
				</View>
				<View style={s.row}>
					<Text style={{ flex: 1 }}>Change every</Text>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
						<Pressable style={s.step} onPress={() => commit({ intervalMin: clampInterval(data.intervalMin - 5) })}><Text style={s.btnText}>{'\u2212'}</Text></Pressable>
						<Text style={{ minWidth: 70, textAlign: 'center', fontWeight: '700' }}>{data.intervalMin} min</Text>
						<Pressable style={s.step} onPress={() => commit({ intervalMin: clampInterval(data.intervalMin + 5) })}><Text style={s.btnText}>+</Text></Pressable>
					</View>
				</View>
				<Text style={s.hint}>
					At least {MIN_INTERVAL_MIN} minutes. Discord limits how often an avatar can change, so slower is safer. It only rotates while Discord is open.
				</Text>
				<View style={s.wrap}>
					<Chip label="In order" on={data.order === 'sequential'} onPress={() => commit({ order: 'sequential' as OrderMode })} />
					<Chip label="Random" on={data.order === 'random'} onPress={() => commit({ order: 'random' as OrderMode })} />
					<Chip label="Fill (crop)" on={data.fit === 'cover'} onPress={() => commit({ fit: 'cover' as FitMode })} />
					<Chip label="Fit (bars)" on={data.fit === 'contain'} onPress={() => commit({ fit: 'contain' as FitMode })} />
				</View>
				<View style={s.wrap}>
					<Btn label={busy ? 'Working\u2026' : 'Change now'} onPress={() => void useNow()} />
				</View>
				{!!msg && <Text style={s.hint}>{msg}</Text>}

				<Text style={s.title}>Collections</Text>
				<View style={s.wrap}>
					{data.collections.map(c => (
						<Chip key={c.id} label={`${c.name} (${c.images.length})`} on={c.id === col.id} onPress={() => { setConfirmDelete(false); commit({ activeId: c.id, state: { ...data.state, cursor: 0 } }) }} />
					))}
				</View>
				<View style={s.wrap}>
					<TextInput style={s.field} value={newName} onChangeText={setNewName} placeholder="New collection name" autoCapitalize="none" />
					<Btn label="Create" onPress={createCollection} />
					<Btn label="Delete this one" muted onPress={deleteCollection} />
				</View>

				<Text style={s.title}>Add images to "{col.name}"</Text>
				<View style={s.wrap}>
					<TextInput style={s.field} value={query} onChangeText={setQuery} placeholder="Search Wikimedia Commons" autoCapitalize="none" onSubmitEditing={() => void doSearch()} />
					<Btn label={busy ? '\u2026' : 'Search'} onPress={() => void doSearch()} />
				</View>
				<View style={s.wrap}>
					<TextInput style={s.field} value={url} onChangeText={setUrl} placeholder="Or paste an https:// image link" autoCapitalize="none" autoCorrect={false} />
					<Btn label="Add link" onPress={() => { addToActive(url); setUrl('') }} />
				</View>
				{results.length > 0 && (
					<View style={s.wrap}>
						{results.map((r, i) => (
							<View key={`${r.url}-${i}`} style={s.card}>
								<Image source={{ uri: r.url }} style={s.thumb} resizeMode="cover" />
								<Text numberOfLines={2} style={{ fontSize: 12 }}>{r.title}</Text>
								<Btn label="Add" onPress={() => addToActive(r.url, r.title)} />
							</View>
						))}
					</View>
				)}

				<Text style={s.title}>In this collection ({col.images.length})</Text>
				{col.images.length === 0 ? (
					<Text style={s.hint}>Nothing here yet. Search above or paste a link.</Text>
				) : (
					<View style={s.wrap}>
						{col.images.map(img => (
							<View key={img.id} style={s.card}>
								<Image source={{ uri: img.url }} style={s.thumb} resizeMode="cover" />
								<Text numberOfLines={2} style={{ fontSize: 12 }}>{img.title}</Text>
								<Btn label="Use now" onPress={() => void useNow(img)} />
								<Btn label="Remove" muted onPress={() => updateActive(removeImageFrom(col, img.id))} />
							</View>
						))}
					</View>
				)}

				<Pressable onPress={() => commit({ size: DEFAULT_SETTINGS.size, quality: DEFAULT_SETTINGS.quality })}>
					<Text style={{ color: '#5865f2' }}>Reset image size and quality ({data.size}px, {data.quality}%)</Text>
				</Pressable>
			</View>
		</ScrollView>
	)
}
