@file:JvmName("AutoPfpPlugin")

package com.khopdi.autopfp

import app.valenced.plugins.PluginBuilder
import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeAsyncMethod
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Suppress("UNUSED")
val autoPfpPlugin: PluginBuilder = plugin {
    start {
        // args: [imageUrl, size, "cover" | "contain", jpegQuality]
        registerNativeAsyncMethod("${manifest.id}.process") { args ->
            val url = args[0] as String
            val size = (args[1] as Number).toInt()
            val fit = args[2] as String
            val quality = (args[3] as Number).toInt()
            withContext(Dispatchers.Default) { ImageProcessor.process(url, size, fit, quality) }
        }
        registerNativeAsyncMethod("${manifest.id}.ping") { _ -> "ready" }
    }
}
