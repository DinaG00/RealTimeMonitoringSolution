-- Insert sample USB logs
INSERT INTO usb_logs (pc, data, timestamp) VALUES 
('PC1', 'USB Flash Drive', datetime('now', '-1 hour', '+2 hours')),
('PC2', 'USB Flash Drive', datetime('now', '-30 minutes', '+2 hours')),
('PC1', 'USB Mouse', datetime('now', '-15 minutes', '+2 hours'));

-- Insert sample clipboard logs
INSERT INTO clipboard_logs (content, timestamp) VALUES 
('Sample text 1', datetime('now', '-45 minutes', '+2 hours')),
('Sample text 2', datetime('now', '-20 minutes', '+2 hours')); 