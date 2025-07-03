-- Drop existing tables if they exist
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS usb_logs;
DROP TABLE IF EXISTS clipboard_logs;
DROP TABLE IF EXISTS processes_logs;
DROP TABLE IF EXISTS process_logs;
DROP TABLE IF EXISTS downloads_logs;
DROP TABLE IF EXISTS application_lists;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS classrooms;
DROP TABLE IF EXISTS pcs;

-- Create applications table (nomenclature)
CREATE TABLE applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert permanent applications nomenclature
INSERT INTO applications (name, display_name) VALUES
('whatsapp.exe', 'WhatsApp'),
('telegram.exe', 'Telegram'),
('signal.exe', 'Signal'),
('facebook_messenger.exe', 'Facebook Messenger'),
('imessage.exe', 'iMessage'),
('discord.exe', 'Discord'),
('slack.exe', 'Slack'),
('skype.exe', 'Skype'),
('zoom.exe', 'Zoom'),
('chrome.exe', 'Google Chrome'),
('firefox.exe', 'Mozilla Firefox'),
('msedge.exe', 'Microsoft Edge'),
('safari.exe', 'Safari'),
('opera.exe', 'Opera'),
('duckduckgo.exe', 'DuckDuckGo'),
('tor.exe', 'Tor Browser'),
('chatgpt.exe', 'ChatGPT'),
('grammarly.exe', 'Grammarly'),
('quillbot.exe', 'QuillBot'),
('jasper.exe', 'Jasper'),
('copyai.exe', 'Copy.ai'),
('googledrive.exe', 'Google Drive'),
('dropbox.exe', 'Dropbox'),
('onedrive.exe', 'OneDrive'),
('icloud.exe', 'iCloud'),
('wetransfer.exe', 'WeTransfer'),
('mega.exe', 'Mega'),
('teamviewer.exe', 'TeamViewer'),
('anydesk.exe', 'AnyDesk'),
('chrome_remote_desktop.exe', 'Chrome Remote Desktop'),
('vmware.exe', 'VMware'),
('virtualbox.exe', 'VirtualBox'),
('parallels.exe', 'Parallels'),
('obs.exe', 'OBS Studio'),
('xsplit.exe', 'XSplit'),
('loom.exe', 'Loom'),
('screencastify.exe', 'Screencastify'),
('screenrec.exe', 'ScreenRec'),
('notion.exe', 'Notion'),
('evernote.exe', 'Evernote'),
('onenote.exe', 'Microsoft OneNote'),
('anki.exe', 'Anki'),
('chegg.exe', 'Chegg'),
('coursehero.exe', 'Course Hero'),
('brainly.exe', 'Brainly'),
('vscode.exe', 'Visual Studio Code'),
('sublime_text.exe', 'Sublime Text'),
('pycharm.exe', 'PyCharm'),
('git.exe', 'Git'),
('terminal.exe', 'Terminal'),
('cmd.exe', 'Command Prompt'),
('notepad.exe', 'Notepad'),
('notepadpp.exe', 'Notepad++'),
('atom.exe', 'Atom'),
('textedit.exe', 'TextEdit'),
('vim.exe', 'Vim'),
('emacs.exe', 'Emacs'),
('devenv.exe', 'Visual Studio'),
('idea.exe', 'IntelliJ IDEA'),
('eclipse.exe', 'Eclipse'),
('netbeans.exe', 'NetBeans'),
('xcode.exe', 'Xcode'),
('studio64.exe', 'Android Studio'),
('codeblocks.exe', 'Code::Blocks'),
('r.exe', 'R'),
('rstudio.exe', 'RStudio'),
('spss.exe', 'SPSS'),
('stata.exe', 'Stata'),
('sas.exe', 'SAS'),
('matlab.exe', 'MATLAB'),
('octave.exe', 'Octave'),
('jasp.exe', 'JASP'),
('jamovi.exe', 'Jamovi'),
('githubdesktop.exe', 'GitHub Desktop'),
('jupyter-notebook.exe', 'Jupyter Notebook'),
('anaconda-navigator.exe', 'Anaconda Navigator'),
('thonny.exe', 'Thonny'),
('bluej.exe', 'BlueJ'),
('brackets.exe', 'Brackets');

-- Create classrooms table
CREATE TABLE classrooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create PCs table
CREATE TABLE pcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pc_name TEXT NOT NULL UNIQUE,
    classroom_id INTEGER,
    is_connected BOOLEAN DEFAULT 0,
    last_connection DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL
);

-- Create processes_logs table
CREATE TABLE processes_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pc_id INTEGER NOT NULL,
    application_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pc_id) REFERENCES pcs(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Create usb_logs table
CREATE TABLE usb_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pc_id INTEGER NOT NULL,
    device_name TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pc_id) REFERENCES pcs(id) ON DELETE CASCADE
);

-- Create clipboard_logs table
CREATE TABLE clipboard_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pc_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pc_id) REFERENCES pcs(id) ON DELETE CASCADE
);

-- Create download logs table
CREATE TABLE downloads_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pc_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pc_id) REFERENCES pcs(id) ON DELETE CASCADE
);

-- Create application_lists table
CREATE TABLE application_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    list_type TEXT NOT NULL CHECK (list_type IN ('whitelist', 'blacklist')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    UNIQUE(application_id, list_type)
);


-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_processes_logs_application ON processes_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_processes_logs_pc ON processes_logs(pc_id);
CREATE INDEX IF NOT EXISTS idx_application_lists_application ON application_lists(application_id);
CREATE INDEX IF NOT EXISTS idx_applications_name ON applications(name);
CREATE INDEX IF NOT EXISTS idx_usb_logs_pc ON usb_logs(pc_id);
CREATE INDEX IF NOT EXISTS idx_clipboard_logs_pc ON clipboard_logs(pc_id);
CREATE INDEX IF NOT EXISTS idx_downloads_logs_pc ON downloads_logs(pc_id);

-- New query to show unique blacklisted apps launched
SELECT DISTINCT a.display_name, a.name
FROM processes_logs pl
JOIN applications a ON pl.application_id = a.id
WHERE pl.pc_id IN (...) 

-- For processes_logs
UPDATE processes_logs
SET timestamp = strftime('%Y-%m-%dT%H:%M:%S.000Z', timestamp) WHERE instr(timestamp, 'T') = 0; 

-- For usb_logs
UPDATE usb_logs SET timestamp = strftime('%Y-%m-%dT%H:%M:%S.000Z', timestamp) WHERE instr(timestamp, 'T') = 0; 

-- For clipboard_logs
UPDATE clipboard_logs SET timestamp = strftime('%Y-%m-%dT%H:%M:%S.000Z', timestamp) WHERE instr(timestamp, 'T') = 0; 

-- For downloads_logs
UPDATE downloads_logs SET timestamp = strftime('%Y-%m-%dT%H:%M:%S.000Z', timestamp) WHERE instr(timestamp, 'T') = 0; 