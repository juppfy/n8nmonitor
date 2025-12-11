# PWA Icons

This directory should contain PWA icons in the following sizes:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Generating Icons

You can generate these icons using tools like:

1. **PWA Asset Generator** (recommended):
   ```bash
   npx pwa-asset-generator public/icon.png public/icons
   ```

2. **Online tools**:
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator

3. **Manual creation**:
   - Create a 512x512px source image
   - Export/resize to all required sizes
   - Ensure icons are square and have proper padding for maskable icons

## Icon Requirements

- **Format**: PNG
- **Purpose**: Should support both "maskable" and "any" purposes
- **Design**: Icons should work well when masked (rounded corners)
- **Background**: Include padding (about 20% of the icon size) for maskable icons

## Temporary Note

Until icons are generated, the PWA will still work but may show a default icon. 
The manifest.json references these icons, so they should be created before production deployment.


