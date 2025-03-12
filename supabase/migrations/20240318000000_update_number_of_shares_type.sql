-- Modify number_of_shares column to use decimal type with 8 decimal places
ALTER TABLE investments
ALTER COLUMN number_of_shares TYPE decimal(20,8); 