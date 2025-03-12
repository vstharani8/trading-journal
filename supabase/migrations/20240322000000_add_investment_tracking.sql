-- Create investments table
CREATE TABLE investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  purchase_price DECIMAL NOT NULL,
  shares DECIMAL NOT NULL,
  commission DECIMAL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create benchmark_values table
CREATE TABLE benchmark_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  sp500_value DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create price_cache table
CREATE TABLE price_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price DECIMAL NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(symbol)
);

-- Create indexes
CREATE INDEX investments_user_id_idx ON investments(user_id);
CREATE INDEX investments_symbol_idx ON investments(symbol);
CREATE INDEX benchmark_values_date_idx ON benchmark_values(date);
CREATE INDEX price_cache_symbol_idx ON price_cache(symbol);

-- Enable Row Level Security
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for investments
CREATE POLICY "Users can view their own investments"
  ON investments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investments"
  ON investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments"
  ON investments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments"
  ON investments FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for benchmark_values (readable by all authenticated users)
CREATE POLICY "All users can view benchmark values"
  ON benchmark_values FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for price_cache (readable by all authenticated users)
CREATE POLICY "All users can view price cache"
  ON price_cache FOR SELECT
  TO authenticated
  USING (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for investments
CREATE TRIGGER update_investments_updated_at
    BEFORE UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 