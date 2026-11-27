/** Pure logic. No Valenced imports, so it can be tested in plain Node. */
import {
	DEFAULT_INTERVAL_MIN,
	DEFAULT_SETTINGS,
	MIN_INTERVAL_MIN,
	type Collection,
	type PfpImage,
	type Settings,
} from './types.js'

export function isHttpsUrl(url: string): boolean {
	return /^https:\/\/[^\s/]+\.[^\s/]+\S*$/i.test(url.trim())
}

export function newId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function clampInterval(minutes: unknown): number {
	const n = Math.round(Number(minutes))
	if (!Number.isFinite(n) || n <= 0) return DEFAULT_INTERVAL_MIN
	return Math.max(MIN_INTERVAL_MIN, Math.min(24 * 60, n))
}

/** Stored settings with defaults filled in and sanity applied. */
export function normalize(raw: any): Settings {
	const s: Settings = { ...DEFAULT_SETTINGS, ...(raw ?? {}) }
	s.state = { ...DEFAULT_SETTINGS.state, ...(raw?.state ?? {}) }
	if (!Array.isArray(s.collections) || s.collections.length === 0) s.collections = DEFAULT_SETTINGS.collections
	s.collections = s.collections.map(c => ({ ...c, images: Array.isArray(c.images) ? c.images : [] }))
	if (!s.collections.some(c => c.id === s.activeId)) s.activeId = s.collections[0].id
	s.intervalMin = clampInterval(s.intervalMin)
	s.size = Math.max(64, Math.min(1024, Math.round(Number(s.size)) || 512))
	s.quality = Math.max(40, Math.min(100, Math.round(Number(s.quality)) || 90))
	return s
}

export function activeCollection(s: Settings): Collection {
	return s.collections.find(c => c.id === s.activeId) ?? s.collections[0]
}

export function titleFromUrl(url: string): string {
	try {
		const last = decodeURIComponent(url.split('?')[0].split('/').pop() || '')
		return last.replace(/^\d+px-/, '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'image'
	} catch {
		return 'image'
	}
}

export function addImageTo(collection: Collection, url: string, title?: string): { collection: Collection; added: boolean; reason?: string } {
	const clean = url.trim()
	if (!isHttpsUrl(clean)) return { collection, added: false, reason: 'Only https:// image links can be added.' }
	if (collection.images.some(i => i.url === clean)) return { collection, added: false, reason: 'That image is already in this collection.' }
	const image: PfpImage = { id: newId(), url: clean, title: (title ?? '').trim() || titleFromUrl(clean), addedAt: Date.now() }
	return { collection: { ...collection, images: [...collection.images, image] }, added: true }
}

export function removeImageFrom(collection: Collection, id: string): Collection {
	return { ...collection, images: collection.images.filter(i => i.id !== id) }
}

/** Chooses the next image. `random` never repeats the image used last (if there is more than one). */
export function pickNext(
	images: PfpImage[],
	order: 'sequential' | 'random',
	state: { cursor: number; lastUrl?: string },
	rng: () => number = Math.random,
): { index: number; nextCursor: number } | null {
	if (images.length === 0) return null
	if (order === 'random') {
		const choices = images.map((_, i) => i).filter(i => images.length === 1 || images[i].url !== state.lastUrl)
		const index = choices[Math.floor(rng() * choices.length)]
		return { index, nextCursor: index }
	}
	const index = ((state.cursor % images.length) + images.length) % images.length
	return { index, nextCursor: (index + 1) % images.length }
}

export function isDue(s: Settings, now: number): boolean {
	if (!s.rotating) return false
	if ((s.state.nextAllowedAt ?? 0) > now) return false
	return s.state.lastChangeAt + s.intervalMin * 60_000 <= now
}

/** Pulls a wait time (ms) out of a Discord error: a 429 carries retry_after in seconds. */
export function retryAfterMs(status: number | undefined, body: any): number | null {
	if (status !== 429) return null
	const secs = Number(body?.retry_after)
	return Number.isFinite(secs) && secs > 0 ? Math.ceil(secs * 1000) : 10 * 60_000
}

export function describeWait(ms: number): string {
	const min = Math.ceil(ms / 60_000)
	return min <= 1 ? 'under a minute' : `${min} min`
}
