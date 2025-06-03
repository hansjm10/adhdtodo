# Database Setup Guide

This directory contains the database schema and setup instructions for the ADHD Todo app's Supabase backend.

## Quick Start

1. **Create a Supabase Project**

   - Go to [https://supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and API keys

2. **Configure Environment Variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Supabase credentials:

   - `EXPO_PUBLIC_SUPABASE_URL`: Your project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your anonymous/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (keep secret!)

3. **Run Database Migration**
   - Open your Supabase dashboard
   - Go to SQL Editor
   - Create a new query
   - Copy the contents of `migrations/001_initial_schema.sql`
   - Run the query

## Database Schema

### Tables

#### `users`

- User profiles and preferences
- Gamification data (streaks, XP)
- Notification settings

#### `tasks`

- Task management with ADHD-friendly features
- Time tracking and estimates
- Reminder scheduling
- Accountability features (assigned by/to)

#### `partnerships`

- Accountability partner relationships
- Status tracking (pending, active, rejected, ended)

#### `notifications`

- User notifications with auto-expiry
- Read/unread status tracking

### Security

All tables have Row Level Security (RLS) enabled:

- Users can only access their own data
- Partners can see shared tasks
- Notifications are user-specific

### Functions & Triggers

- `update_updated_at_column()`: Automatically updates `updated_at` timestamps
- `cleanup_old_notifications()`: Removes expired notifications (30+ days old)

## Development Tips

1. **Testing RLS Policies**
   Use the Supabase dashboard's SQL editor with different user contexts to test policies.

2. **Local Development**
   Consider using Supabase CLI for local development:

   ```bash
   npx supabase init
   npx supabase start
   ```

3. **Migrations**
   When adding new features:
   - Create a new migration file (e.g., `002_feature_name.sql`)
   - Test thoroughly in development
   - Apply to production carefully

## Troubleshooting

- **"cannot execute CREATE EXTENSION"**: Use the Supabase dashboard, not the MCP query tool
- **RLS Policy Issues**: Check auth.uid() is properly set
- **Missing Tables**: Ensure you've run the complete migration script

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
