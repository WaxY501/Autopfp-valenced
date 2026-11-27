# AutoPFP Rotator

## Current modules
- Rotation preview core (preview callback only; no Discord avatar modification)
- Wikimedia Commons image search
- Persistent IndexedDB gallery with image import-from-URL/file and download helpers
- Gallery UI wired to IndexedDB
- Persistent named collections/themes stored in IndexedDB
- Square resize and JPEG quality processing wired to settings
- Fill/crop and fit/contain processing modes

## Stage 4 caveats
- Device file import uses a web-style input picker; confirm it works in the target Valenced Android runtime.
- URL image fetch may fail on sources that disallow cross-origin downloads.
- The workflow performs source checks, not a full Valenced package build.
- No automated Discord avatar modification is implemented.
