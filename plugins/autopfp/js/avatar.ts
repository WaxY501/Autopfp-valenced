/**
 * Changes the user's avatar through Discord's own request module, so the app attaches its own login.
 * Valenced has no typed wrapper for it, so the module is found by the functions it exposes. Like the
 * message module, it can load late, so this waits for it as well as checking right away.
 */
import { getModules, lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { retryAfterMs } from './core.js'
import { diag } from './diag.js'

let rest: any

const FILTERS = [withProps('getAPIBaseURL', 'patch'), withProps('patch', 'post', 'get', 'put')]

export function startRestLookup(logger?: any): () => void {
	const found = (m: any) => {
		if (rest || typeof m?.patch !== 'function') return
		rest = m
		diag.rest = 'found'
		logger?.log?.('[AutoPFP] Discord request module found')
	}
	for (const f of FILTERS) {
		try {
			const [m] = lookupModule(f)
			found(m)
			if (rest) break
		} catch {}
	}
	const unsubs: (() => void)[] = []
	if (!rest) {
		diag.rest = 'waiting for Discord\u2019s request module\u2026'
		for (const f of FILTERS) {
			try {
				unsubs.push(getModules(f, (m: any) => found(m)))
			} catch (e) {
				diag.rest = `lookup error: ${String(e).slice(0, 80)}`
			}
		}
	}
	return () => {
		for (const u of unsubs) {
			try { u() } catch {}
		}
		rest = undefined
	}
}

export type AvatarResult = { ok: true } | { ok: false; status?: number; retryMs?: number; error: string }

export async function setAvatar(base64Jpeg: string): Promise<AvatarResult> {
	if (!rest) return { ok: false, error: 'Discord\u2019s request module was not found, so the avatar cannot be changed.' }
	try {
		await rest.patch({ url: '/users/@me', body: { avatar: `data:image/jpeg;base64,${base64Jpeg}` } })
		return { ok: true }
	} catch (e: any) {
		const status: number | undefined = e?.status ?? e?.statusCode
		const body = e?.body ?? e?.response?.body
		const retry = retryAfterMs(status, body)
		const msg = body?.message ?? body?.errors?.avatar?._errors?.[0]?.message ?? e?.message ?? String(e)
		return { ok: false, status, retryMs: retry ?? undefined, error: `${status ? `HTTP ${status}: ` : ''}${String(msg).slice(0, 160)}` }
	}
}
