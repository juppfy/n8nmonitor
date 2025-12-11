# VAPID Keys Setup Guide

## What are VAPID Keys?

VAPID (Voluntary Application Server Identification) keys are used to identify your server when sending push notifications. They ensure that push notifications come from your authorized server.

## Generate VAPID Keys

### Option 1: Using web-push CLI (Recommended)

1. Install `web-push` globally:
```bash
npm install -g web-push
```

2. Generate VAPID keys:
```bash
web-push generate-vapid-keys
```

This will output:
```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib27SOwQglxrmPGnSF...

Private Key:
YUieqPllD72LGjn85R7g3OsuQCbq0SH9D7...

=======================================
```

### Option 2: Using Node.js Script

Create a file `generate-vapid.js`:
```javascript
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Public Key:', vapidKeys.publicKey);
console.log('VAPID Private Key:', vapidKeys.privateKey);
```

Run it:
```bash
node generate-vapid.js
```

## Add to Environment Variables

Add the generated keys to your `.env` file:

```env
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib27SOwQglxrmPGnSF...
VAPID_PRIVATE_KEY=YUieqPllD72LGjn85R7g3OsuQCbq0SH9D7...
VAPID_EMAIL=mailto:your-email@example.com
```

**Important:**
- Keep the private key secret (never commit to git)
- The email should be a valid contact email for your service
- Both keys must be kept together (don't regenerate one without the other)

## Testing

After setup, you can verify your VAPID keys are working by:
1. Going to Settings → Notifications
2. Clicking "Enable Push Notifications"
3. Allowing browser permissions
4. Sending a test notification

## Troubleshooting

### "Invalid VAPID keys" error
- Make sure both public and private keys are added to `.env`
- Restart your dev server after adding keys
- Verify there are no extra spaces in the keys

### Browser doesn't show permission prompt
- HTTPS is required for push notifications (localhost works for dev)
- Some browsers block notifications by default - check browser settings
- Try a different browser (Chrome/Edge recommended)

### Push notifications not received
- Verify VAPID_EMAIL is in correct format: `mailto:your-email@example.com`
- Check browser console for errors
- Ensure service worker is registered and active


