using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Diagnostics;

namespace MonitoringService
{
    public class DownloadsMonitor
    {
        // Use absolute paths
        private readonly string _downloadsFolder = UserFoldersHelper.GetDownloadsFolder();
        private readonly string _picturesFolder = UserFoldersHelper.GetPicturesFolder();
        private readonly string _documentsFolder = UserFoldersHelper.GetDocumentsFolder();

        private readonly HashSet<string> _trackedExtensions = new HashSet<string>
        {
            ".pdf", ".exe", ".zip", ".jpg", ".png", ".mp4", ".docx", ".txt", ".doc"  
        };

        private Thread _monitorThread;
        private bool _isMonitoring;
        private HashSet<string> _trackedFiles;  

        public DownloadsMonitor()
        {
            _isMonitoring = false;
            _trackedFiles = new HashSet<string>(); 
        }

        public void StartMonitoring()
        {
            LogToEventViewer($"Monitoring will use Downloads: '{_downloadsFolder}', Pictures: '{_picturesFolder}', Documents: '{_documentsFolder}'");
            LogToEventViewer("Download, Pictures, and Documents folder monitoring is starting...");
            if (_isMonitoring)
            {
                LogToEventViewer("Download, Pictures, and Documents folder monitoring is already running.");
                return;
            }

            _isMonitoring = true;
            _monitorThread = new Thread(() =>
            {
                try
                {
                    TrackInitialFiles();

                    while (_isMonitoring)
                    {
                        MonitorFolder(_downloadsFolder);
                        MonitorFolder(_picturesFolder);
                        MonitorFolder(_documentsFolder);

                        Thread.Sleep(5000);
                    }
                }
                catch (Exception ex)
                {
                    LogToEventViewer("Error in download monitoring: " + ex.Message);
                }
            });

            _monitorThread.IsBackground = true;
            _monitorThread.Start();
        }

        public void StopMonitoring()
        {
            if (!_isMonitoring)
            {
                LogToEventViewer("Download, Pictures, and Documents folder monitoring is not running.");
                return;
            }

            try
            {
                _isMonitoring = false;
                _monitorThread?.Abort();
                LogToEventViewer("Monitoring stopped.");
            }
            catch (Exception ex)
            {
                LogToEventViewer("Error stopping download monitoring: " + ex.Message);
            }
        }

        private void TrackInitialFiles()
        {
            try
            {
                
                var files = Directory.GetFiles(_downloadsFolder)
                    .Concat(Directory.GetFiles(_picturesFolder))
                    .Concat(Directory.GetFiles(_documentsFolder));

                foreach (var file in files)
                {
                    var fileInfo = new FileInfo(file);
                    _trackedFiles.Add(fileInfo.FullName);  
                }
            }
            catch (Exception ex)
            {
                LogToEventViewer("Error tracking initial files: " + ex.Message);
            }
        }

        private void MonitorFolder(string folderPath)
        {
            try
            {
                if (!Directory.Exists(folderPath))
                {
                    LogToEventViewer($"Folder {folderPath} not found.");
                    return;
                }

                var files = Directory.GetFiles(folderPath);
                foreach (var file in files)
                {
                    var fileInfo = new FileInfo(file);
                    var fileExtension = fileInfo.Extension.ToLower();

                    if (_trackedExtensions.Contains(fileExtension) && !_trackedFiles.Contains(fileInfo.FullName))
                    {
                        LogFileCreation(file);
                        _trackedFiles.Add(fileInfo.FullName);  
                    }
                }
            }
            catch (Exception ex)
            {
                LogToEventViewer("Error monitoring folder: " + ex.Message);
            }
        }

        private void LogFileCreation(string filePath)
        {
            var fileInfo = new FileInfo(filePath);
            string message = $"[Download Detected] {fileInfo.Name} at {fileInfo.CreationTime:yyyy-MM-dd HH:mm:ss}";

            try
            {
                LogToEventViewer(message);
            }
            catch (Exception ex)
            {
                LogToEventViewer("Error writing to Event Log: " + ex.Message);
            }

            ApiLogger.Log("Download", filePath);
        }

        private void LogToEventViewer(string message)
        {
            try
            {
                if (!EventLog.SourceExists("DownloadsMonitor"))
                {
                    EventLog.CreateEventSource("DownloadsMonitor", "Application");
                }

                EventLog.WriteEntry("DownloadsMonitor", message, EventLogEntryType.Information);
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("DownloadsMonitor", "Error writing to Event Log: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
}
