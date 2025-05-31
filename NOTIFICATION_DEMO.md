# Notification UI Components Demo

This document explains how to use the newly created notification UI components for the ADHD Todo app.

## Components Created

### 1. NotificationBanner

- Animated banner that slides down from the top of the screen
- Auto-dismisses after 5 seconds for non-critical notifications
- Supports swipe-to-dismiss (up or horizontally)
- Different styles for different notification types
- Located at: `/src/components/NotificationBanner.js`

### 2. NotificationList

- Full-screen view of all notifications
- Shows notification history with timestamps
- Marks notifications as read when viewed
- Clear all notifications functionality
- Located at: `/src/screens/NotificationListScreen.js`

### 3. NotificationBadge

- Bell icon with unread count badge
- Shows in the Tasks screen header
- Located at: `/src/components/NotificationBadge.js`

### 4. NotificationContainer

- Manages the notification queue and display
- Automatically checks for new notifications every 5 seconds
- Located at: `/src/components/NotificationContainer.js`

## How to Test

1. **Start the app** and log in/create a user account

2. **Navigate to Focus Mode** screen

3. **Tap "Test Notifications"** button at the bottom

   - This will create 5 different types of test notifications
   - Notifications will appear one by one with 2-second delays

4. **Observe the notification banners**:

   - Task Assigned (blue)
   - Encouragement (orange)
   - Task Completed (green)
   - Task Overdue (red - won't auto-dismiss)
   - Check-in (purple)

5. **Interact with notifications**:

   - Swipe up or sideways to dismiss
   - Tap to navigate to related content
   - Critical notifications (overdue) must be manually dismissed

6. **Check the notification badge**:

   - Look at the bell icon in the Tasks screen header
   - Shows unread count
   - Updates automatically

7. **View notification history**:
   - Tap the bell icon to open NotificationList
   - See all notifications with timestamps
   - Tap to mark as read
   - Use "Clear All" to remove all notifications

## Integration with NotificationService

The UI components integrate seamlessly with the existing `NotificationService`:

```javascript
// Send a notification
await NotificationService.sendNotification(userId, NOTIFICATION_TYPES.ENCOURAGEMENT, {
  message: "You're doing great!",
  fromUser: 'John',
  taskId: 'task_123',
});

// Get unread count
const count = await NotificationService.getUnreadNotificationCount(userId);

// Mark as read
await NotificationService.markNotificationAsRead(notificationId);
```

## Notification Types and Styles

| Type                    | Icon                | Color  | Auto-dismiss |
| ----------------------- | ------------------- | ------ | ------------ |
| TASK_ASSIGNED           | add-circle          | Blue   | Yes          |
| TASK_STARTED            | play-circle         | Green  | Yes          |
| TASK_COMPLETED          | checkmark-circle    | Green  | Yes          |
| TASK_OVERDUE            | alert-circle        | Red    | No           |
| ENCOURAGEMENT           | heart               | Orange | Yes          |
| CHECK_IN                | chatbubble-ellipses | Purple | Yes          |
| DEADLINE_CHANGE_REQUEST | time                | Orange | No           |

## Customization

### Timing

- Auto-dismiss delay: 5 seconds (line 29 in NotificationBanner.js)
- Check interval: 5 seconds (line 37 in NotificationContainer.js)

### Styling

- Colors defined in getNotificationStyle() methods
- Banner height: 100px (BANNER_HEIGHT constant)
- Swipe threshold: 50px (SWIPE_THRESHOLD constant)

## Production Notes

1. Remove the test button from FocusModeScreen before production
2. In production, notifications would come from a backend/push notification service
3. The current implementation stores notifications in memory (NotificationService)
4. Consider implementing proper push notifications with expo-notifications

## Accessibility

- All notifications have proper color contrast
- Icons provide visual context
- Text is readable at various font sizes
- Swipe gestures have alternatives (tap to dismiss)
