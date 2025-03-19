-- Add default strategies
INSERT INTO strategies (name, user_id) 
SELECT 'Base on Base', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Box', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Channel', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Cheat', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'CwH', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Flag', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'iH&S', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Inside Day', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Intraday', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'IPO base', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Low Cheat', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Pennant', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Shakeout', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Tight Closes', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Trendline', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Triangle', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'VCP', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'W-pattern', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Wedge', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Cup', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO strategies (name, user_id) 
SELECT 'Reversal', id FROM auth.users
ON CONFLICT (name, user_id) DO NOTHING; 