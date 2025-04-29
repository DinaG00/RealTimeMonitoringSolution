-- Test data for usb_logs
INSERT INTO usb_logs (device_id, device_name, action) VALUES
('USB001', 'SanDisk USB Drive', 'CONNECTED'),
('USB002', 'Logitech Mouse', 'CONNECTED'),
('USB001', 'SanDisk USB Drive', 'DISCONNECTED');

-- Test data for clipboard_logs
INSERT INTO clipboard_logs (content) VALUES
('Hello, this is a test clipboard entry'),
('Another clipboard test with some text'),
('Testing clipboard monitoring functionality');

-- Test data for process_logs
INSERT INTO process_logs (process_name, window_title, action, start_time, end_time) VALUES
('notepad.exe', 'Untitled - Notepad', 'START', datetime('now', '-1 hour'), NULL),
('chrome.exe', 'Google Chrome', 'START', datetime('now', '-30 minutes'), NULL),
('notepad.exe', 'Untitled - Notepad', 'END', datetime('now', '-1 hour'), datetime('now', '-45 minutes')); 