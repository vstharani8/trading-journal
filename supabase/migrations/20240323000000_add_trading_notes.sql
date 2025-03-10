-- Create trading notes table
CREATE TABLE trading_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trade_notes', 'trading_goals', 'trading_plan', 'mistakes_reflection')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX trading_notes_user_id_idx ON trading_notes(user_id);
CREATE INDEX trading_notes_type_idx ON trading_notes(type);

-- Enable Row Level Security
ALTER TABLE trading_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own trading notes"
  ON trading_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trading notes"
  ON trading_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading notes"
  ON trading_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trading notes"
  ON trading_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_trading_notes_updated_at
  BEFORE UPDATE ON trading_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 