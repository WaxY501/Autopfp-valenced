export interface PfpImage {
	id: string
	url: string
	title: string
	addedAt: number
}

export interface Collection {
	id: string
	name: string
	images: PfpImage[]
}

export type OrderMode = 'sequential' | 'random'
export type FitMode = 'cover' | 'contain'

export interface RotationState {
	/** Index of the image to use next (sequential mode). */
	cursor: number
	lastChangeAt: number
	lastUrl?: string
	/** Earliest time another change may be tried (set after a Discord rate limit or an error). */
	nextAllowedAt?: number
}

export interface Settings {
	collections: Collection[]
	activeId: string
	rotating: boolean
	intervalMin: number
	order: OrderMode
	fit: FitMode
	size: number
	quality: number
	state: RotationState
}

export const MIN_INTERVAL_MIN = 10
export const DEFAULT_INTERVAL_MIN = 30

export const DEFAULT_SETTINGS: Settings = {
	collections: [{ id: 'default', name: 'My images', images: [] }],
	activeId: 'default',
	rotating: false,
	intervalMin: DEFAULT_INTERVAL_MIN,
	order: 'sequential',
	fit: 'cover',
	size: 512,
	quality: 90,
	state: { cursor: 0, lastChangeAt: 0 },
}

export interface SearchImage {
	title: string
	/** Scaled-down version used for previews and for the avatar itself. */
	url: string
	originalUrl: string
}
