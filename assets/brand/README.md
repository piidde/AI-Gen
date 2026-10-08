# AIAPI.deals brand assets

Source logo files. The site serves its own copies from `frontend/public/`
(`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-*.png`); the header
mark is inlined in `frontend/src/components/Brand.tsx`. Change all three together.

| File | Use |
| --- | --- |
| `aiapi-mark.svg` | App icon / favicon: ink price tag with a % cut-out on a yellow tile. |
| `aiapi-mark-ink.svg` | Same mark for dark surfaces (yellow tag on ink). |
| `aiapi-mark-square.svg` | Full-bleed tile for iOS (the OS rounds the corners). |
| `aiapi-mark-maskable.svg` | Android maskable icon; tag kept inside the 80% safe zone. |
| `aiapi-logo.svg` | Primary horizontal logo on light backgrounds. |
| `aiapi-logo-inverse.svg` | Horizontal logo on dark backgrounds. |
| `aiapi-wordmark.svg` | Wordmark without the mark. |
| `png/` | Raster exports (mark 512/1024, logos 1200px wide) for docs, social and press. |

Colors: ink `#111111`, yellow `#FFDD33`, paper `#F1F1EC` (see `frontend/src/styles/tokens.css`).
Wordmark type is Archivo Black-weight (wght 900, wdth 75), converted to outlines, so
the SVGs render identically without the font installed.
