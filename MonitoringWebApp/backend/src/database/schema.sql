-- Create tables
CREATE TABLE IF NOT EXISTS usb_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pc_id TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clipboard_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS process_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_name TEXT NOT NULL,
    window_title TEXT NOT NULL,
    action TEXT NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usb_logs_timestamp ON usb_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_clipboard_logs_timestamp ON clipboard_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_process_logs_timestamp ON process_logs(timestamp); 