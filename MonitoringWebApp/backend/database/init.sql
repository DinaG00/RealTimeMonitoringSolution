-- Drop existing tables if they exist
DROP TABLE IF EXISTS usb_logs;
DROP TABLE IF EXISTS clipboard_logs;
DROP TABLE IF EXISTS processes_logs;
DROP TABLE IF EXISTS downloads_logs;

-- Create USB logs table
CREATE TABLE usb_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pc TEXT NOT NULL,
    data TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create clipboard logs table
CREATE TABLE clipboard_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pc TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create processes logs table
CREATE TABLE processes_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pc TEXT NOT NULL,
    process_name TEXT NOT NULL,
    action TEXT,
    start_time DATETIME,
    end_time DATETIME
);

-- Create downloads logs table
CREATE TABLE downloads_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pc TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
); 