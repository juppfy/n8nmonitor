# 🚀 Quick Start: Push Notifications

## 1. Generate VAPID Keys (2 minutes)

```bash
npm install -g web-push
web-push generate-vapid-keys
```

Copy the output and add to `.env`:
```env
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa...
VAPID_PRIVATE_KEY=YUieqPllD72LGjn85R7g3OsuQ...
VAPID_EMAIL=mailto:your-email@example.com
```

## 2. Create App Icons (5 minutes)

Create a simple 512x512 PNG logo, then:

```bash
npx pwa-asset-generator public/logo.png public/icons --icon-only
```

Or manually create these sizes in `public/icons/`:
- icon-72x72.png, icon-96x96.png, icon-128x128.png
- icon-144x144.png, icon-152x152.png, icon-192x192.png
- icon-384x384.png, icon-512x512.png

## 3. Set Up Cron Job (2 minutes)

### For Vercel

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/monitor-notifications",
    "schedule": "*/5 * * * *"
  }]
}
```

### For Other Platforms

Point a cron service to: `POST https://your-domain.com/api/cron/monitor-notifications`

Schedule: Every 5 minutes (`*/5 * * * *`)

## 4. Test (3 minutes)

1. Start server: `npm run dev`
2. Go to: `http://localhost:3000/settings/notifications`
3. Click "Enable Push Notifications"
4. Allow browser permission
5. Click "Send Test Notification"
6. ✅ You should see a notification!

## 5. Configure Your Preferences

- **Error Threshold**: Notify after X consecutive errors (default: 1)
- **Auto-Deactivate**: Disable workflows after X errors (default: off)
- **Notification Types**: Choose errors, warnings, or success alerts

## Admin Features

Go to `/settings/users` to:
- Manage all users' notification settings
- Enable/disable alerts per user
- Configure team-wide notification rules

## That's It! 🎉

Your push notifications are ready. You'll now receive alerts for:
- ❌ Workflow errors (based on your threshold)
- 🔴 Auto-deactivated workflows
- ✅ Workflow successes (if enabled)

See `PUSH_NOTIFICATIONS_SETUP.md` for detailed documentation.


