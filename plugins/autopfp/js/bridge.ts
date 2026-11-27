import { callNativeMethod } from '@valenced/modules/native'

export const PLUGIN_ID = 'com.khopdi.autopfp'

declare module '@valenced/modules/native' {
	export interface NativeMethods {
		'com.khopdi.autopfp.process': [args: [url: string, size: number, fit: string, quality: number], returnValue: string]
		'com.khopdi.autopfp.ping': [args: [], returnValue: string]
	}
}

export type ProcessResult = { ok: true; data: string; width: number; height: number } | { ok: false; error: string }

/** Downloads the image and returns a square JPEG as base64, processed on the phone. */
export async function processImage(url: string, size: number, fit: string, quality: number): Promise<ProcessResult> {
	try {
		return JSON.parse(String(await callNativeMethod(`${PLUGIN_ID}.process`, [url, size, fit, quality]))) as ProcessResult
	} catch (e: any) {
		return { ok: false, error: String(e?.message ?? e) }
	}
}

export async function pingNative(): Promise<string> {
	try {
		return String(await callNativeMethod(`${PLUGIN_ID}.ping`, []))
	} catch (e: any) {
		return `unavailable: ${String(e?.message ?? e).slice(0, 120)}`
	}
}
