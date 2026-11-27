import { setAvatar } from './avatar.js'
import { processImage } from './bridge.js'
import { activeCollection, describeWait, isDue, normalize, pickNext } from './core.js'
import { diag } from './diag.js'
import type { PfpImage, Settings } from './types.js'

interface Deps {
	storage: any
	logger?: any
}

let deps: Deps | null = null
let timer: ReturnType<typeof setInterval> | null = null

const load = (): Settings => normalize(deps?.storage?.cache)

function saveState(patch: Partial<Settings['state']>) {
	try {
		void deps?.storage?.set({ state: patch })
	} catch (e) {
		deps?.logger?.warn?.('[AutoPFP] could not save state', e)
	}
}

const result = (text: string) => (diag.lastResult = text)

/**
 * Changes the avatar now. Without `image`, takes the next one in the active collection.
 * Never throws; returns a sentence describing what happened.
 */
export async function changeNow(image?: PfpImage): Promise<string> {
	if (!deps) return 'Plugin is not running.'
	if (diag.busy) return 'Already changing the picture.'
	diag.busy = true
	try {
		const s = load()
		const col = activeCollection(s)
		const now = Date.now()
		const wait = (s.state.nextAllowedAt ?? 0) - now
		if (wait > 0) return result(`Waiting for Discord\u2019s limit: try again in ${describeWait(wait)}.`)

		let chosen = image
		let nextCursor = s.state.cursor
		if (!chosen) {
			const pick = pickNext(col.images, s.order, s.state)
			if (!pick) return result('This collection has no images.')
			chosen = col.images[pick.index]
			nextCursor = pick.nextCursor
		} else {
			const idx = col.images.findIndex(i => i.id === chosen!.id)
			if (idx >= 0) nextCursor = (idx + 1) % col.images.length
		}

		const processed = await processImage(chosen.url, s.size, s.fit, s.quality)
		if (!processed.ok) {
			// Skip this image next time and do not hammer a broken link.
			saveState({ cursor: nextCursor, nextAllowedAt: now + 2 * 60_000 })
			return result(`Could not prepare "${chosen.title}": ${processed.error}`)
		}

		const res = await setAvatar(processed.data)
		if (res.ok) {
			saveState({ cursor: nextCursor, lastChangeAt: now, lastUrl: chosen.url, nextAllowedAt: 0 })
			return result(`Changed to "${chosen.title}" at ${new Date(now).toLocaleTimeString()}.`)
		}
		const backoff = res.retryMs ? Math.max(res.retryMs, 60_000) : 5 * 60_000
		saveState({ nextAllowedAt: now + backoff })
		return result(`Discord refused the change (${res.error}). Pausing ${describeWait(backoff)}.`)
	} catch (e: any) {
		return result(`Unexpected error: ${String(e?.message ?? e).slice(0, 160)}`)
	} finally {
		diag.busy = false
	}
}

async function tick() {
	if (!deps) return
	if (isDue(load(), Date.now())) await changeNow()
}

export function startRotationEngine(d: Deps): () => void {
	deps = d
	diag.engineRunning = true
	// Checked every 30 s, so a change that came due while the app was asleep happens soon after it wakes.
	timer = setInterval(() => void tick(), 30_000)
	const first = setTimeout(() => void tick(), 10_000)
	return () => {
		if (timer) clearInterval(timer)
		clearTimeout(first)
		timer = null
		deps = null
		diag.engineRunning = false
	}
}

/** When the next automatic change is due, as text for the settings screen. */
export function nextChangeText(s: Settings, now = Date.now()): string {
	if (!s.rotating) return 'Rotation is off'
	const col = activeCollection(s)
	if (col.images.length < 2) return 'Add at least 2 images to rotate'
	const due = Math.max(s.state.lastChangeAt + s.intervalMin * 60_000, s.state.nextAllowedAt ?? 0)
	return due <= now ? 'Due now' : `Next change in ${describeWait(due - now)}`
}
