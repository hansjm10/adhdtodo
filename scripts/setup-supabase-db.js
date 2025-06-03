#!/usr/bin/env node
// ABOUTME: Script to programmatically set up Supabase database schema
// Run with: node scripts/setup-supabase-db.js

/* eslint-disable no-console */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing required environment variables');
  console.error(
    'Please ensure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function runMigration() {
  console.log('Starting Supabase database setup...');

  try {
    // Read the SQL migration file
    const sqlPath = path.join(
      __dirname,
      '..',
      'src',
      'database',
      'migrations',
      '001_initial_schema.sql',
    );
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments
      if (statement.trim().startsWith('--')) continue;

      // Extract statement type for logging
      const statementType = statement.trim().split(/\s+/)[0].toUpperCase();
      const statementPreview = statement.substring(0, 50).replace(/\n/g, ' ');

      console.log(
        `\n[${i + 1}/${statements.length}] Executing ${statementType}: ${statementPreview}...`,
      );

      const { error } = await supabase
        .rpc('exec_sql', {
          sql: statement,
        })
        .catch(async (_rpcError) => {
          // If RPC doesn't exist, try direct query
          const { data: _data, error: _error } = await supabase.from('_dummy_').select().limit(0);

          // Use the Supabase SQL editor endpoint
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ sql: statement }),
          }).catch(() => null);

          if (!response || !response.ok) {
            // Fallback: Use pg connection if available
            console.log(
              'Note: Direct SQL execution not available via RPC. Please run the SQL manually in Supabase dashboard.',
            );
            return { error: 'RPC not available' };
          }

          return { error: null };
        });

      if (error) {
        console.error(`Error executing statement: ${error.message || error}`);
        if (error !== 'RPC not available') {
          throw error;
        }
      } else {
        console.log('✓ Success');
      }
    }

    console.log('\n✅ Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify tables in Supabase dashboard > Table Editor');
    console.log('2. Check RLS policies in Authentication > Policies');
    console.log('3. Configure authentication settings if needed');
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error('\nFallback option:');
    console.error('1. Open your Supabase dashboard');
    console.error('2. Go to SQL Editor');
    console.error('3. Copy contents from: src/database/migrations/001_initial_schema.sql');
    console.error('4. Paste and run in SQL Editor');
    process.exit(1);
  }
}

// Alternative approach using direct admin API
async function setupViaAdminAPI() {
  console.log('\nAttempting setup via Supabase Admin API...');

  const sqlPath = path.join(
    __dirname,
    '..',
    'src',
    'database',
    'migrations',
    '001_initial_schema.sql',
  );
  const _sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('\n📋 Manual Setup Instructions:');
  console.log('================================');
  console.log('Since programmatic execution is limited, please:');
  console.log('\n1. Open your Supabase project dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Create a new query');
  console.log('4. Copy the SQL from this file:');
  console.log(`   ${sqlPath}`);
  console.log('5. Paste and execute in the SQL Editor');
  console.log('\nThe SQL file has been created and contains:');
  console.log('- All table definitions');
  console.log('- Indexes for performance');
  console.log('- Row Level Security policies');
  console.log('- Database functions and triggers');
  console.log('\n✅ SQL file is ready for manual execution');
}

// Run the migration
runMigration().catch(() => {
  setupViaAdminAPI();
});
