# Chrome Web Store Release Checklist

## Required Before Upload

- [x] Manifest V3 extension builds successfully.
- [x] Store icon generated at 128x128.
- [x] Extension icons generated at 16, 32, 48, and 128.
- [x] At least one 1280x800 screenshot generated.
- [x] Small promo tile generated at 440x280.
- [x] Marquee promo image generated at 1400x560.
- [x] Store listing draft written.
- [x] Privacy policy draft written.
- [x] Upload ZIP generated from `dist`.
- [x] Replace placeholder support URL.
- [x] Replace placeholder privacy contact.
- [ ] Register Chrome Web Store developer account if needed.
- [ ] Upload ZIP and store assets in the Developer Dashboard.
- [ ] Complete dashboard privacy fields using `docs/STORE_LISTING.md`.

## Verification Commands

```bash
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

## Asset Paths

- Upload package: `release/json-workbench-extension-0.1.0.zip`
- Store icon: `store-assets/icons/store-icon-128.png`
- Screenshots: `store-assets/screenshots/`
- Small promo tile: `store-assets/promotional/small-promo-440x280.png`
- Marquee image: `store-assets/promotional/marquee-1400x560.png`
