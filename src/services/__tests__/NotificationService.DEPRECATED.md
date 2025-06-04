# Deprecated NotificationService Tests

As of the Phase 2 Supabase migration (#109), NotificationService has been completely rewritten to use Supabase directly instead of AsyncStorage. This means the following test file is no longer valid:

## Deprecated Test File:

- `NotificationService.test.js` - Tests for AsyncStorage implementation

## Current Test File:

- `NotificationService.supabase.test.js` - Tests for the new Supabase implementation

## Migration Notes:

The new NotificationService:

- Uses Supabase for all notification persistence
- Includes real-time notification delivery
- No longer needs manual cleanup (handled by database TTL)
- Supports real-time subscriptions for instant notifications

To run the current tests:

```bash
npm test -- --testPathPattern=NotificationService.supabase.test.js
```
