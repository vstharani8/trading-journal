-- Create reminder_settings table
CREATE TABLE reminder_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_frequency TEXT CHECK (reminder_frequency IN ('immediate', 'bi-weekly', 'monthly')),
  reminder_day INTEGER CHECK (reminder_day BETWEEN 1 AND 31),
  reminder_time TIME,
  reminder_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Create index
CREATE INDEX reminder_settings_user_id_idx ON reminder_settings(user_id);

-- Enable Row Level Security
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reminder settings"
  ON reminder_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminder settings"
  ON reminder_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminder settings"
  ON reminder_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_reminder_settings_updated_at
  BEFORE UPDATE ON reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add reminder settings columns to user_settings table
ALTER TABLE reminder_settings
ALTER COLUMN reminder_frequency TYPE TEXT,
DROP CONSTRAINT IF EXISTS reminder_settings_reminder_frequency_check,
ADD CONSTRAINT reminder_settings_reminder_frequency_check 
    CHECK (reminder_frequency IN ('immediate', 'bi-weekly', 'monthly'));