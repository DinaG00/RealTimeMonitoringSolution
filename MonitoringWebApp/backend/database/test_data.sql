-- Insert test data for USB logs
INSERT INTO usb_logs (pc, data, timestamp) VALUES 
    ('PC1', 'USB Device Connected', datetime('now', '-1 hour')),
    ('PC2', 'USB Device Removed', datetime('now', '-30 minutes')),
    ('PC1', 'USB Mass Storage Detected', datetime('now', '-15 minutes'));

-- Insert test data for clipboard logs
INSERT INTO clipboard_logs (content, timestamp) VALUES 
    ('Test clipboard content 1', datetime('now', '-2 hours')),
    ('Test clipboard content 2', datetime('now', '-1 hour')),
    ('Test clipboard content 3', datetime('now', '-30 minutes')); 