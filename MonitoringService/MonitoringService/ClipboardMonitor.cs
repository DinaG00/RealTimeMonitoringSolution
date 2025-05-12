using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace MonitoringService
{
    public class ClipboardMonitor
    {
        private Process _clipboardProcess;
        private Thread _clipboardMonitoringThread;
        private EventLog _eventLog;
        private bool _isRunning;

        public ClipboardMonitor()
        {
            _eventLog = new EventLog();
            _eventLog.Source = "ClipboardMonitoringService";
            _isRunning = false;
        }

        public void StartClipboardMonitoring()
        {
            if (_isRunning)
            {
                _eventLog.WriteEntry("Clipboard monitoring is already running.", EventLogEntryType.Warning);
                return;  
            }

            _clipboardMonitoringThread = new Thread(() =>
            {
                try
                {
                    string consoleAppPath = "C:\\Users\\Dina\\Documents\\CSIE\\licenta\\application\\RealTimeMonitoryingSolution\\MonitoringService\\ClipboardConsoleApp\\ClipboardConsoleApp\\bin\\Debug\\ClipboardConsoleApp.exe";
                    _eventLog.WriteEntry($"Attempting to start clipboard monitoring from path: {consoleAppPath}");

                    if (!File.Exists(consoleAppPath))
                    {
                        _eventLog.WriteEntry("Clipboard monitoring app not found at: " + consoleAppPath, EventLogEntryType.Error);
                        return;
                    }

                    ProcessStartInfo startInfo = new ProcessStartInfo
                    {
                        FileName = consoleAppPath,
                        UseShellExecute = true,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };

                    _clipboardProcess = Process.Start(startInfo);
                    _isRunning = true;

                    if (_clipboardProcess != null)
                    {
                        _eventLog.WriteEntry($"Clipboard monitoring process started with ID: {_clipboardProcess.Id}");
                    }
                    else
                    {
                        _eventLog.WriteEntry("Failed to start clipboard monitoring process", EventLogEntryType.Error);
                    }
                }
                catch (Exception ex)
                {
                    _eventLog.WriteEntry("Error in clipboard monitoring: " + ex.Message, EventLogEntryType.Error);
                }
            });

            _clipboardMonitoringThread.IsBackground = true;
            _clipboardMonitoringThread.Start();
        }

        public void StopClipboardMonitoring()
        {
            if (!_isRunning)
            {
                _eventLog.WriteEntry("Clipboard monitoring is not running.", EventLogEntryType.Warning);
                return;  
            }

            try
            {
                _clipboardProcess?.Kill();
                _clipboardProcess?.WaitForExit();
                _clipboardProcess?.Dispose();
                _clipboardMonitoringThread?.Abort();  
                _isRunning = false;
                _eventLog.WriteEntry("Clipboard monitoring stopped.");
            }
            catch (Exception ex)
            {
                _eventLog.WriteEntry("Error stopping clipboard monitoring: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
}
