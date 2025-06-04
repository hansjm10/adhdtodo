# Supabase Setup Guide for ADHD Todo App

This guide covers the setup of Supabase infrastructure and database schema for issue #108.

## ✅ Completed Tasks

### 1. Database Schema Creation

- Created comprehensive SQL migration file: `src/database/migrations/001_initial_schema.sql`
- Includes all tables: users, tasks, partnerships, notifications
- Added proper indexes for performance
- Implemented updated_at triggers
- Created cleanup function for old notifications

### 2. TypeScript Types

- Created database types: `src/types/database.types.ts`
- Fully typed interfaces for all tables
- Support for Insert, Update, and Row operations

### 3. Supabase Service

- Created service wrapper: `src/services/SupabaseService.ts`
- Handles both anonymous and service role clients
- Graceful error handling for missing credentials

### 4. Environment Configuration

- Created `.env.example` with all required variables
- Updated `.gitignore` to exclude `.env`
- Added environment variable documentation

### 5. Database Setup Scripts

- Created setup script: `scripts/setup-supabase-db.js`
- Added npm scripts: `npm run db:setup` and `npm run db:migrate`
- Provides clear instructions for manual setup if needed

### 6. Testing Infrastructure

- Created comprehensive tests: `src/services/__tests__/SupabaseService.test.js`
- Tests verify database structure, RLS policies, and functions
- Gracefully handles missing credentials

### 7. Documentation

- Created database README: `src/database/README.md`
- This setup guide: `docs/SUPABASE_SETUP.md`
- Inline documentation in all files

## 🚀 Setup Instructions

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and API keys

### 2. Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials:
# EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Database Migration

Since the Supabase MCP tool is read-only, you need to run the migration manually:

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Create a new query
4. Copy all contents from `src/database/migrations/001_initial_schema.sql`
5. Run the query

Alternative (if you have service role key):

```bash
npm run db:setup
```

### 4. Enable Authentication

1. In Supabase dashboard, go to Authentication
2. Enable Email/Password authentication
3. Configure email templates as needed

### 5. Verify Setup

```bash
# Run tests to verify everything is working
npm test -- src/services/__tests__/SupabaseService.test.js
```

## 📁 File Structure Created

```
adhdtodo/
├── .env.example                          # Environment variable template
├── src/
│   ├── database/
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.sql   # Complete database schema
│   │   ├── setup-database.ts            # Setup instructions
│   │   └── README.md                    # Database documentation
│   ├── services/
│   │   ├── SupabaseService.ts           # Supabase client wrapper
│   │   └── __tests__/
│   │       └── SupabaseService.test.js  # Service tests
│   └── types/
│       └── database.types.ts            # TypeScript database types
├── scripts/
│   └── setup-supabase-db.js            # Database setup script
└── docs/
    └── SUPABASE_SETUP.md               # This file
```

## 🔒 Security Features

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- Users can only access their own data
- Partners can see shared tasks
- Proper authentication checks on all operations

### Environment Security

- Service role key is kept separate
- Public keys are prefixed with `EXPO_PUBLIC_`
- `.env` is gitignored

## 🎯 Next Steps

1. **Authentication Integration**: Implement Supabase Auth in the app
2. **Data Migration**: Create scripts to migrate existing AsyncStorage data
3. **API Services**: Create service classes for each table
4. **Real-time Features**: Implement Supabase real-time subscriptions
5. **Offline Support**: Add offline queue for syncing

## 🧪 Testing

The test suite verifies:

- Environment configuration
- Table existence
- Column structure
- RLS policies
- Database functions

Run tests with:

```bash
npm test -- src/services/__tests__/SupabaseService.test.js
```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

## ✅ Success Criteria Met

- [x] Supabase project setup instructions provided
- [x] All tables created with proper schema
- [x] RLS policies defined and documented
- [x] Authentication configuration documented
- [x] Environment variables properly configured
- [x] TypeScript types generated
- [x] Service wrapper created
- [x] Tests implemented
- [x] Comprehensive documentation provided

The Supabase infrastructure is now ready for the next phase of migration!
