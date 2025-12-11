# 🔔 Push Notifications Setup Guide

## ✅ What's Been Implemented

### 1. **Database Schema**
- ✅ `UserSettings` - Notification preferences per user
- ✅ `PushSubscription` - Browser push subscriptions
- ✅ `NotificationLog` - Track sent notifications
- ✅ `WorkflowErrorCounter` - Monitor consecutive errors

### 2. **Backend Services**
- ✅ Push notification library (`lib/notifications/push.ts`)
- ✅ Notification monitoring service (`lib/services/notification-monitor.ts`)
- ✅ VAPID keys configuration

### 3. **API Endpoints**
- ✅ `POST /api/notifications/subscribe` - Subscribe to push notifications
- ✅ `POST /api/notifications/unsubscribe` - Unsubscribe from notifications
- ✅ `POST /api/notifications/test` - Send test notification
- ✅ `GET /api/notifications/vapid-public-key` - Get VAPID public key
- ✅ `GET /api/settings` - Get user notification settings
- ✅ `PUT /api/settings` - Update notification settings
- ✅ `GET /api/admin/users` - List all users (admin only)
- ✅ `PUT /api/admin/users/[userId]/notifications` - Update user settings (admin)
- ✅ `POST /api/cron/monitor-notifications` - Background job for monitoring

### 4. **Frontend Pages**
- ✅ `/settings/notifications` - User notification preferences
- ✅ `/settings/users` - Admin user management (requires ADMIN role)

### 5. **PWA Support**
- ✅ Service worker (`public/sw.js`)
- ✅ PWA manifest (`public/manifest.json`)
- ✅ Push notification handlers

## 🚀 Setup Instructions

### Step 1: Generate VAPID Keys

See `VAPID_SETUP.md` for detailed instructions. Quick version:

```bash
npm install -g web-push
web-push generate-vapid-keys
```

Add to `.env`:
```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:your-email@example.com
```

### Step 2: Run Database Migration

Already done! The migration `20251211103317_add_notification_features` has been applied.

### Step 3: Create App Icons

Create PNG icons in `public/icons/` with these sizes:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

**Quick way:** Use a tool like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator) or create them from a single logo:

```bash
npx pwa-asset-generator logo.png public/icons --icon-only
```

### Step 4: Set Up Cron Job

The notification monitor needs to run periodically to check for errors and send notifications.

#### Option A: Vercel Cron (Recommended for Vercel deployments)

Create/update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/monitor-notifications",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### Option B: External Cron Service

Use a service like:
- [EasyCron](https://www.easycron.com/)
- [cron-job.org](https://cron-job.org/)
- Your own server's crontab

Point it to: `POST https://your-domain.com/api/cron/monitor-notifications`

Run every 5 minutes: `*/5 * * * *`

#### Option C: Self-Hosted with Node-Cron

Install:
```bash
npm install node-cron
```

Create `lib/cron.ts`:
```typescript
import cron from 'node-cron';
import { runNotificationMonitor } from './services/notification-monitor';

export function startCronJobs() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running notification monitor...');
    await runNotificationMonitor();
  });
  
  console.log('Cron jobs started');
}
```

Call it in your app startup.

### Step 5: Update Layout for PWA

Add to `app/layout.tsx` in the `<head>`:

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#000000" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
```

### Step 6: Test Push Notifications

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Navigate to Settings > Notifications**
   - Go to `http://localhost:3000/settings/notifications`

3. **Enable Push Notifications**
   - Click "Enable" button
   - Allow browser permission when prompted

4. **Send Test Notification**
   - Click "Send Test Notification"
   - You should receive a push notification

5. **Test with Real Error**
   - Trigger a workflow error in n8n
   - Wait for the cron job to run (or manually call the API)
   - Check that you receive an error notification

## 📋 Features

### For Users

1. **Notification Triggers**
   - ✅ Workflow errors
   - ✅ Workflow success (optional)
   - ✅ Warnings (optional)

2. **Error Threshold**
   - Send notification after X consecutive errors (1-20)
   - Prevents notification spam

3. **Auto-Deactivation**
   - Automatically disable workflows after X consecutive errors (3-50)
   - Prevents runaway error workflows

4. **Multiple Channels**
   - ✅ Push notifications (browser)
   - ✅ Email notifications (future enhancement)

5. **Custom Email**
   - Set a different email for notifications
   - Falls back to account email if not set

### For Admins

1. **User Management**
   - View all users and their notification settings
   - Enable/disable notifications for specific users
   - Configure error thresholds per user

2. **Notification Logs**
   - Track all sent notifications
   - See which users received alerts
   - Debug notification issues

## 🔍 How It Works

### Workflow Monitoring

1. **Cron Job Runs** (every 5 minutes)
   - Fetches recent executions from all active n8n instances
   - Checks for new executions since last run

2. **Error Detection**
   - Identifies failed executions
   - Updates error counter for each workflow
   - Tracks consecutive errors

3. **Notification Decision**
   - Checks user notification settings
   - Compares consecutive errors against threshold
   - Decides whether to send notification

4. **Notification Sending**
   - Sends push notification to all user's devices
   - Logs notification in database
   - Updates execution data

5. **Auto-Deactivation** (if enabled)
   - When threshold reached, deactivates workflow in n8n
   - Updates database
   - Sends deactivation notification

### Error Reset

- Consecutive error counter resets to 0 on successful execution
- Auto-deactivation status can be manually reset

## 🧪 Testing Checklist

- [ ] VAPID keys configured in `.env`
- [ ] Service worker registered at `/sw.js`
- [ ] Manifest accessible at `/manifest.json`
- [ ] Icons created in `public/icons/`
- [ ] Push notification permission granted
- [ ] Test notification received
- [ ] Real error notification received
- [ ] Error threshold works correctly
- [ ] Auto-deactivation triggers (if enabled)
- [ ] Admin can manage user notifications
- [ ] Cron job runs successfully

## 🐛 Troubleshooting

### Push notifications not working

1. **Check VAPID keys**
   ```bash
   echo $VAPID_PUBLIC_KEY
   echo $VAPID_PRIVATE_KEY
   ```

2. **Check browser support**
   - Chrome/Edge: ✅ Fully supported
   - Firefox: ✅ Fully supported
   - Safari: ⚠️ Limited support (iOS 16.4+)

3. **Check HTTPS**
   - Push notifications require HTTPS in production
   - `localhost` works for development

4. **Check browser permissions**
   - Settings > Site Settings > Notifications
   - Make sure your site is allowed

### Cron job not running

1. **Manual test**
   ```bash
   curl -X POST http://localhost:3000/api/cron/monitor-notifications
   ```

2. **Check logs**
   - Look for `[Notification Monitor]` in console

3. **Verify instances are active**
   - Check database: `SELECT * FROM N8nInstance WHERE isActive = 1`

### No notifications received

1. **Check user settings**
   - Go to `/settings/notifications`
   - Verify "Notify on Error" is enabled
   - Check error threshold

2. **Check push subscriptions**
   - Database: `SELECT * FROM PushSubscription WHERE userId = 'YOUR_USER_ID'`

3. **Check notification logs**
   - Database: `SELECT * FROM NotificationLog ORDER BY createdAt DESC`

## 🎯 Next Steps

1. **Add Email Notifications**
   - Integrate with Resend/SendGrid
   - Send email alerts alongside push notifications

2. **Add Slack/Discord Integration**
   - Send notifications to team channels

3. **Add Notification History**
   - UI page to view past notifications
   - Filter by type, workflow, date

4. **Add Notification Scheduling**
   - Quiet hours (don't send notifications at night)
   - Notification frequency limits

5. **Add Custom Notification Rules**
   - Notify specific users for specific workflows
   - Different thresholds per workflow

## 📚 Resources

- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)


