-- ABOUTME: Enhanced partnerships table to support full feature set
-- Adds invite codes, settings, stats, and proper ADHD user/partner role distinction

-- First, let's add the missing columns to the partnerships table
ALTER TABLE partnerships 
  -- Role-based partnership (more explicit than user1/user2)
  ADD COLUMN adhd_user_id UUID REFERENCES users(id),
  ADD COLUMN partner_id UUID REFERENCES users(id),
  ADD COLUMN invite_sent_by UUID REFERENCES users(id),
  
  -- Invite system
  ADD COLUMN invite_code TEXT UNIQUE,
  
  -- Enhanced status tracking
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ADD COLUMN accepted_at_new TIMESTAMP WITH TIME ZONE,
  ADD COLUMN terminated_at TIMESTAMP WITH TIME ZONE,
  
  -- Partnership settings
  ADD COLUMN settings JSONB DEFAULT '{
    "allowTaskAssignment": true,
    "shareProgress": true,
    "allowEncouragement": true,
    "allowCheckIns": true,
    "quietHoursStart": null,
    "quietHoursEnd": null
  }'::jsonb,
  
  -- Partnership statistics
  ADD COLUMN stats JSONB DEFAULT '{
    "tasksAssigned": 0,
    "tasksCompleted": 0,
    "encouragementsSent": 0,
    "checkInsCompleted": 0,
    "partnershipDuration": 0
  }'::jsonb;

-- Update status values to match TypeScript enum
ALTER TABLE partnerships DROP CONSTRAINT partnerships_status_check;
ALTER TABLE partnerships ADD CONSTRAINT partnerships_status_check 
  CHECK (status IN ('pending', 'active', 'paused', 'declined', 'terminated'));

-- Migrate existing data: convert user1_id/user2_id to adhd_user_id/partner_id
-- For existing partnerships, we'll assume user1 is the ADHD user and user2 is the partner
UPDATE partnerships 
SET 
  adhd_user_id = user1_id,
  partner_id = user2_id,
  invite_sent_by = user1_id,
  accepted_at_new = accepted_at,
  invite_code = 'legacy-' || id::text -- Generate legacy invite codes
WHERE adhd_user_id IS NULL;

-- Drop old columns after migration
ALTER TABLE partnerships 
  DROP COLUMN user1_id,
  DROP COLUMN user2_id,
  DROP COLUMN accepted_at;

-- Rename the new accepted_at column
ALTER TABLE partnerships RENAME COLUMN accepted_at_new TO accepted_at;

-- Add indexes for performance
CREATE INDEX idx_partnerships_adhd_user_id ON partnerships(adhd_user_id);
CREATE INDEX idx_partnerships_partner_id ON partnerships(partner_id);
CREATE INDEX idx_partnerships_invite_code ON partnerships(invite_code);
CREATE INDEX idx_partnerships_status ON partnerships(status);

-- Add updated_at trigger
CREATE TRIGGER update_partnerships_updated_at BEFORE UPDATE ON partnerships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update RLS policies for the new column structure
DROP POLICY "View own partnerships" ON partnerships;
DROP POLICY "Create partnerships" ON partnerships;
DROP POLICY "Update own partnerships" ON partnerships;

-- New RLS policies
CREATE POLICY "View own partnerships" ON partnerships
  FOR SELECT USING (
    auth.uid() = adhd_user_id OR 
    auth.uid() = partner_id
  );

CREATE POLICY "Create partnerships" ON partnerships
  FOR INSERT WITH CHECK (
    auth.uid() = adhd_user_id OR 
    auth.uid() = partner_id OR
    auth.uid() = invite_sent_by
  );

CREATE POLICY "Update own partnerships" ON partnerships
  FOR UPDATE USING (
    auth.uid() = adhd_user_id OR 
    auth.uid() = partner_id
  );

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM partnerships WHERE invite_code = result) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update partnership stats
CREATE OR REPLACE FUNCTION update_partnership_stats(
  partnership_id UUID,
  stat_key TEXT,
  increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  UPDATE partnerships 
  SET 
    stats = jsonb_set(
      stats, 
      array[stat_key], 
      ((COALESCE((stats->>stat_key)::INTEGER, 0) + increment)::TEXT)::jsonb
    ),
    updated_at = timezone('utc'::text, now())
  WHERE id = partnership_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment partnership duration daily (to be called by a cron job)
CREATE OR REPLACE FUNCTION update_partnership_durations()
RETURNS VOID AS $$
BEGIN
  UPDATE partnerships 
  SET stats = jsonb_set(
    stats, 
    array['partnershipDuration'], 
    (EXTRACT(DAY FROM (timezone('utc'::text, now()) - created_at))::TEXT)::jsonb
  )
  WHERE status = 'active';
END;
$$ LANGUAGE plpgsql;