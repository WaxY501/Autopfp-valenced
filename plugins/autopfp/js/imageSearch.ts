import type { SearchImage } from './types.js'

const ENDPOINT = 'https://commons.wikimedia.org/w/api.php'

const enc = (v: string | number) => encodeURIComponent(String(v))

/** Searches Wikimedia Commons (free, no key). Built by hand because React Native's URLSearchParams is incomplete. */
export async function searchImages(query: string, limit = 24): Promise<SearchImage[]> {
	const q = query.trim()
	if (!q) return []
	const params: Record<string, string | number> = {
		action: 'query',
		generator: 'search',
		gsrsearch: q,
		gsrnamespace: 6,
		gsrlimit: Math.min(Math.max(limit, 1), 50),
		prop: 'imageinfo',
		iiprop: 'url',
		iiurlwidth: 1024,
		format: 'json',
	}
	const qs = Object.entries(params).map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&')
	const response = await fetch(`${ENDPOINT}?${qs}`, { headers: { 'User-Agent': 'AutoPFP-Valenced/2.0 (profile picture rotator plugin)' } })
	if (!response.ok) throw new Error(`Search failed: HTTP ${response.status}`)
	const data: any = await response.json()
	const pages = Object.values(data?.query?.pages ?? {}) as any[]
	return pages
		.filter(p => p?.imageinfo?.[0]?.thumburl)
		.map(p => ({
			title: String(p.title ?? '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, ''),
			url: String(p.imageinfo[0].thumburl),
			originalUrl: String(p.imageinfo[0].url ?? p.imageinfo[0].thumburl),
		}))
		.filter(i => /\.(jpe?g|png|webp)(\?.*)?$/i.test(i.url))
}
