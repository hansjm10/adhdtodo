-- ABOUTME: Initial database schema for ADHD Todo app Supabase migration
-- This file creates all tables, RLS policies, functions, and triggers

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS partnerships CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- User preferences
  notification_preferences JSONB DEFAULT '{"global": "all"}'::jsonb,
  preferred_start_time TIME,
  theme TEXT DEFAULT 'system',
  
  -- Gamification
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  xp_total INTEGER DEFAULT 0,
  
  -- Metadata
  device_tokens TEXT[],
  last_active TIMESTAMP WITH TIME ZONE
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'home',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  
  -- Timing
  due_date TIMESTAMP WITH TIME ZONE,
  time_estimate INTEGER, -- minutes
  time_spent INTEGER DEFAULT 0, -- minutes
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Accountability
  assigned_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  
  -- Reminders
  reminder_1 TIMESTAMP WITH TIME ZONE,
  reminder_2 TIMESTAMP WITH TIME ZONE,
  reminder_custom TIMESTAMP WITH TIME ZONE,
  
  -- Gamification
  xp_earned INTEGER DEFAULT 0,
  streak_contribution BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for tasks table
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Create partnerships table
CREATE TABLE partnerships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'ended')),
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  accepted_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure no duplicate partnerships
  UNIQUE(user1_id, user2_id)
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification details
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  priority TEXT DEFAULT 'medium',
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Cleanup: auto-delete after 30 days
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + interval '30 days')
);

-- Create indexes for notifications table
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users Table RLS Policies
-- Users can only read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Tasks Table RLS Policies
-- Users can view their own tasks and tasks assigned to them
CREATE POLICY "View own and assigned tasks" ON tasks
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_to
  );

-- Users can create their own tasks
CREATE POLICY "Create own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks or tasks assigned to them
CREATE POLICY "Update own and assigned tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_to
  );

-- Users can delete only their own tasks
CREATE POLICY "Delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Partnerships Table RLS Policies
-- Users can view partnerships they're part of
CREATE POLICY "View own partnerships" ON partnerships
  FOR SELECT USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

-- Users can create partnerships
CREATE POLICY "Create partnerships" ON partnerships
  FOR INSERT WITH CHECK (auth.uid() = user1_id);

-- Users can update partnerships they're part of
CREATE POLICY "Update own partnerships" ON partnerships
  FOR UPDATE USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

-- Notifications Table RLS Policies
-- Users can only view their own notifications
CREATE POLICY "View own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS VOID AS $$
BEGIN
  DELETE FROM notifications
  WHERE expires_at < timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql;

-- Note: For production, consider setting up pg_cron to run cleanup_old_notifications() periodically