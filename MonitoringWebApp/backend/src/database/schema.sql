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

CREATE TABLE IF NOT EXISTS download_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pc_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    url TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_name TEXT NOT NULL,
    list_type TEXT NOT NULL CHECK (list_type IN ('whitelist', 'blacklist')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(application_name, list_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usb_logs_timestamp ON usb_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_clipboard_logs_timestamp ON clipboard_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_process_logs_timestamp ON process_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_download_logs_timestamp ON download_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_application_lists_list_type ON application_lists(list_type); 