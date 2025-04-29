-- Delete all data from tables
DELETE FROM usb_logs;
DELETE FROM clipboard_logs;
DELETE FROM process_logs;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('usb_logs', 'clipboard_logs', 'process_logs');

-- Delete all process logs
DELETE FROM process_logs;

-- Reset the auto-increment counter for process_logs
DELETE FROM sqlite_sequence WHERE name = 'process_logs'; 