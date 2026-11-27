# AutoPFP Rotator (Valenced)

Rotates your Discord profile picture through collections of images you choose.

- Collections of images, added by Wikimedia Commons search or by pasting an https:// image link
- Rotates in order or randomly, every 10+ minutes (Discord limits avatar changes, so slower is safer)
- Images are cropped or fitted to a square and compressed on the phone (native Kotlin), then sent through Discord's own request module
- Settings are stored with the plugin's JSON storage; nothing is sent to any server except the image downloads themselves

Limits: it only rotates while Discord is open, and Discord decides how often an avatar may change.
