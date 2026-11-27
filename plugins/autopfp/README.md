# AutoPFP Rotator

## Implemented source modules
- Rotation core and timer callback
- Wikimedia Commons image search
- Settings screen with image search results and previews
- Add/remove images from a session gallery
- Manual image URL entry
- Preview rotation timer and manual previous/next
- Session-only named collections/themes
- Preview crop mode and size/quality preference fields

## Limitations in this stage
- Session gallery and collections are in-memory only (not persistent).
- Device file picker is not connected; add images through search or URL.
- Processing fields are UI settings only; actual resize/compression is not wired into the settings screen.
- Preview rotation only changes the displayed preview. It does not modify a Discord avatar.
- Full plugin packaging/build validation requires the Valenced API dependencies and is not performed by this workflow.
