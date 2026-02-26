# Browser Notifications Feature

## Overview
The chat application now supports Web Browser Notifications that alert users when new messages arrive while the chat tab is minimized or in the background.

## How It Works

### Automatic Permission Request
- When you first join a chat room, the browser will ask for notification permission
- Click "Allow" to enable notifications

### Notification Behavior
Notifications will appear when:
- A new message arrives from another user (not yourself)
- The chat tab is in the background or minimized
- You have granted notification permission

Notifications will NOT appear when:
- You send a message yourself (checked by username)
- The chat tab is currently focused/active
- System messages are received
- Permission is denied or not granted

**Note**: All room members (host and participants) will receive notifications equally when messages arrive from other users.

### Notification Content
Each notification shows:
- **Title**: Room name (e.g., "Secure Chat" or your custom room name)
- **Body**: Username and message preview
  - Regular messages: First 100 characters
  - Polls: "[POLL]" indicator with question preview
  - Images: "[Classified Image]" indicator

### Notification Actions
- **Click notification**: Brings the chat window into focus
- **Auto-close**: Notifications automatically close after 5 seconds

## Visual Indicator

A bell icon appears in the chat header showing notification status:

- 🟢 **Green bell**: Notifications enabled
- 🔴 **Red bell**: Notifications blocked (click for help)
- ⚪ **Pulsing white bell**: Click to enable notifications

## Browser Support

This feature works on:
- ✅ Chrome/Edge (Desktop & Android)
- ✅ Firefox (Desktop & Android)
- ✅ Safari (Desktop & iOS 16.4+)
- ✅ Opera (Desktop & Android)

## Privacy & Security

- Notifications respect the app's security features
- Message content is decrypted before showing in notifications
- Notifications are temporary and don't persist in notification history
- Uses the same encryption as the chat room

## Troubleshooting

### Notifications Not Working?

1. **Check browser permission**:
   - Chrome: Settings → Privacy and security → Site Settings → Notifications
   - Firefox: Settings → Privacy & Security → Permissions → Notifications
   - Safari: System Preferences → Notifications → [Your Browser]

2. **Ensure tab is in background**: Notifications only show when the tab is not focused

3. **Check Do Not Disturb**: System-level DND settings may block notifications

4. **Try re-enabling**: Click the bell icon to request permission again

### Re-enable Blocked Notifications

If you accidentally blocked notifications:
1. Click the lock icon in your browser's address bar
2. Find "Notifications" in the permissions list
3. Change from "Block" to "Allow"
4. Refresh the page

## Technical Details

- Uses the Web Notifications API
- Notifications are tagged by room ID to prevent duplicates
- Automatically requests permission on first visit
- Respects `document.hasFocus()` to detect background state
- 5-second auto-close timer for better UX
