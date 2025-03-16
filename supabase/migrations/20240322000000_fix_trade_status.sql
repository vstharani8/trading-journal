-- Drop existing triggers first
DROP TRIGGER IF EXISTS update_trade_on_exit_trigger ON trade_exits;
DROP TRIGGER IF EXISTS update_trade_on_exit_delete_trigger ON trade_exits;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_trade_on_exit();
DROP FUNCTION IF EXISTS update_trade_on_exit_delete();

-- Create improved function to update trade status and remaining quantity
CREATE OR REPLACE FUNCTION update_trade_on_exit()
RETURNS TRIGGER AS $$
DECLARE
    total_exit_quantity DECIMAL;
    trade_total_quantity DECIMAL;
BEGIN
    -- Get the trade's total quantity
    SELECT quantity INTO trade_total_quantity
    FROM trades
    WHERE id = NEW.trade_id;

    -- Calculate total exit quantity for this trade (including the new exit)
    SELECT COALESCE(SUM(quantity), 0)
    INTO total_exit_quantity
    FROM (
        SELECT quantity FROM trade_exits 
        WHERE trade_id = NEW.trade_id AND id != NEW.id
        UNION ALL
        SELECT NEW.quantity
    ) all_exits;

    -- Update the trade
    UPDATE trades
    SET 
        remaining_quantity = quantity - total_exit_quantity,
        average_exit_price = (
            SELECT COALESCE(SUM(exit_price * quantity) / NULLIF(SUM(quantity), 0), NULL)
            FROM (
                SELECT exit_price, quantity FROM trade_exits 
                WHERE trade_id = NEW.trade_id AND id != NEW.id
                UNION ALL
                SELECT NEW.exit_price, NEW.quantity
            ) all_exits
        ),
        status = CASE 
            WHEN total_exit_quantity >= quantity THEN 'closed'
            ELSE 'open'
        END
    WHERE id = NEW.trade_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create improved function to handle trade exit deletions
CREATE OR REPLACE FUNCTION update_trade_on_exit_delete()
RETURNS TRIGGER AS $$
DECLARE
    total_exit_quantity DECIMAL;
    trade_total_quantity DECIMAL;
BEGIN
    -- Get the trade's total quantity
    SELECT quantity INTO trade_total_quantity
    FROM trades
    WHERE id = OLD.trade_id;

    -- Calculate remaining exit quantity for this trade
    SELECT COALESCE(SUM(quantity), 0)
    INTO total_exit_quantity
    FROM trade_exits
    WHERE trade_id = OLD.trade_id AND id != OLD.id;

    -- Update the trade
    UPDATE trades
    SET 
        remaining_quantity = quantity - total_exit_quantity,
        average_exit_price = CASE 
            WHEN total_exit_quantity = 0 THEN NULL
            ELSE (
                SELECT COALESCE(SUM(exit_price * quantity) / NULLIF(SUM(quantity), 0), NULL)
                FROM trade_exits
                WHERE trade_id = OLD.trade_id AND id != OLD.id
            )
        END,
        status = CASE 
            WHEN total_exit_quantity >= quantity THEN 'closed'
            ELSE 'open'
        END
    WHERE id = OLD.trade_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create new triggers
CREATE TRIGGER update_trade_on_exit_trigger
    AFTER INSERT OR UPDATE ON trade_exits
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_on_exit();

CREATE TRIGGER update_trade_on_exit_delete_trigger
    AFTER DELETE ON trade_exits
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_on_exit_delete();

-- Function to fix any incorrect trade statuses
CREATE OR REPLACE FUNCTION fix_trade_statuses()
RETURNS void AS $$
BEGIN
    UPDATE trades t
    SET 
        remaining_quantity = t.quantity - COALESCE(
            (SELECT SUM(quantity) FROM trade_exits WHERE trade_id = t.id),
            0
        ),
        average_exit_price = (
            SELECT COALESCE(SUM(exit_price * quantity) / NULLIF(SUM(quantity), 0), NULL)
            FROM trade_exits
            WHERE trade_id = t.id
        ),
        status = CASE 
            WHEN COALESCE((SELECT SUM(quantity) FROM trade_exits WHERE trade_id = t.id), 0) >= t.quantity 
            THEN 'closed'
            ELSE 'open'
        END;
END;
$$ LANGUAGE plpgsql;

-- Execute the fix function
SELECT fix_trade_statuses(); 