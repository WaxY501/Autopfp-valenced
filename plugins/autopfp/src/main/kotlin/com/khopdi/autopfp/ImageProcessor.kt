package com.khopdi.autopfp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.util.Base64
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL

/** Downloads an image and turns it into a square JPEG, entirely on the phone. */
internal object ImageProcessor {
    private const val MAX_BYTES = 20 * 1024 * 1024
    private const val BACKGROUND = 0xFF1E1F22.toInt()

    fun process(url: String, size: Int, fit: String, quality: Int): String {
        return try {
            require(size in 64..1024) { "size out of range" }
            val bytes = download(url)
            val bitmap = decode(bytes, size)
            try {
                val square = squareOf(bitmap, size, fit == "contain")
                val out = ByteArrayOutputStream()
                square.compress(Bitmap.CompressFormat.JPEG, quality.coerceIn(40, 100), out)
                square.recycle()
                JSONObject().put("ok", true).put("data", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP))
                    .put("width", size).put("height", size).toString()
            } finally {
                bitmap.recycle()
            }
        } catch (t: Throwable) {
            JSONObject().put("ok", false).put("error", "${t.javaClass.simpleName}: ${t.message}").toString()
        }
    }

    private fun download(url: String): ByteArray {
        val u = URL(url)
        require(u.protocol == "https") { "only https links are allowed" }
        val c = u.openConnection() as HttpURLConnection
        c.connectTimeout = 10_000
        c.readTimeout = 20_000
        c.instanceFollowRedirects = true
        c.setRequestProperty("User-Agent", "AutoPFP-Valenced/2.0 (profile picture rotator plugin)")
        try {
            if (c.responseCode !in 200..299) error("HTTP ${c.responseCode}")
            c.inputStream.use { input ->
                val out = ByteArrayOutputStream()
                val buf = ByteArray(16 * 1024)
                var total = 0
                while (true) {
                    val n = input.read(buf)
                    if (n < 0) break
                    total += n
                    if (total > MAX_BYTES) error("image too large")
                    out.write(buf, 0, n)
                }
                return out.toByteArray()
            }
        } finally {
            c.disconnect()
        }
    }

    /** Decodes at reduced size when the picture is much larger than needed, to save memory. */
    private fun decode(bytes: ByteArray, size: Int): Bitmap {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        require(bounds.outWidth > 0 && bounds.outHeight > 0) { "not a readable image" }
        var sample = 1
        while (minOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= size) sample *= 2
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts) ?: error("could not decode image")
    }

    /** cover: fill the square and crop the overflow. contain: whole picture, with bars. */
    private fun squareOf(src: Bitmap, size: Int, contain: Boolean): Bitmap {
        val out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(out)
        canvas.drawColor(BACKGROUND)
        val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG)
        val sw = src.width.toFloat()
        val sh = src.height.toFloat()
        if (contain) {
            val scale = minOf(size / sw, size / sh)
            val w = (sw * scale).toInt().coerceAtLeast(1)
            val h = (sh * scale).toInt().coerceAtLeast(1)
            val left = (size - w) / 2
            val top = (size - h) / 2
            canvas.drawBitmap(src, null, Rect(left, top, left + w, top + h), paint)
        } else {
            val scale = maxOf(size / sw, size / sh)
            val cw = size / scale
            val ch = size / scale
            val left = ((sw - cw) / 2f).toInt().coerceAtLeast(0)
            val top = ((sh - ch) / 2f).toInt().coerceAtLeast(0)
            val right = (left + cw).toInt().coerceAtMost(src.width)
            val bottom = (top + ch).toInt().coerceAtMost(src.height)
            canvas.drawBitmap(src, Rect(left, top, right, bottom), Rect(0, 0, size, size), paint)
        }
        return out
    }
}
