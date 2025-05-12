using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace MonitoringService
{
    public class ProcessMonitor
    {
        private Thread _processMonitoringThread;
        private Dictionary<int, TrackedProcess> _trackedProcesses;
        private EventLog _eventLog;
        private bool _isRunning;
        private HashSet<string> _blacklistedApplications;

        public ProcessMonitor()
        {
            _eventLog = new EventLog();
            _eventLog.Source = "ProcessMonitoringService";
            _trackedProcesses = new Dictionary<int, TrackedProcess>();
            _isRunning = false;
            _blacklistedApplications = new HashSet<string>();
            // Initial fetch of blacklist
            _ = UpdateBlacklistAsync();
        }

        private async Task UpdateBlacklistAsync()
        {
            try
            {
                _blacklistedApplications = await ApiLogger.GetBlacklistedApplicationsAsync();
                _eventLog.WriteEntry($"Updated blacklist with {_blacklistedApplications.Count} applications", EventLogEntryType.Information);
            }
            catch (Exception ex)
            {
                _eventLog.WriteEntry($"Error updating blacklist: {ex.Message}", EventLogEntryType.Error);
            }
        }

        public void StartProcessMonitoring()
        {
            if (_isRunning)
            {
                _eventLog.WriteEntry("Process monitoring is already running.", EventLogEntryType.Warning);
                return;
            }

            _processMonitoringThread = new Thread(async () =>
            {
                try
                {
                    _isRunning = true;
                    _eventLog.WriteEntry("Process monitoring started.");

                    while (_isRunning)
                    {
                        try
                        {
                            // Update blacklist periodically
                            await UpdateBlacklistAsync();

                            var currentProcesses = Process.GetProcesses();
                            var currentProcessIds = new HashSet<int>();

                            foreach (var process in currentProcesses)
                            {
                                if (process.SessionId == 0 || string.IsNullOrEmpty(process.ProcessName))
                                    continue;

                                string windowTitle = process.MainWindowTitle;
                                if (string.IsNullOrWhiteSpace(windowTitle))
                                    windowTitle = "(No window title)";

                                // Check if process is blacklisted
                                bool isBlacklisted = _blacklistedApplications.Contains(process.ProcessName.ToLower() + ".exe");

                                if ((isBlacklisted || IsRelevantProcess(process.ProcessName, windowTitle)) && !_trackedProcesses.ContainsKey(process.Id))
                                {
                                    var trackedProcess = new TrackedProcess
                                    {
                                        Id = process.Id,
                                        ProcessName = process.ProcessName,
                                        WindowTitle = windowTitle,
                                        StartTime = DateTime.Now,
                                        IsBlacklisted = isBlacklisted
                                    };

                                    _trackedProcesses.Add(process.Id, trackedProcess);

                                    string processData = $"{trackedProcess.ProcessName}|{trackedProcess.WindowTitle}|Started at {trackedProcess.StartTime:yyyy-MM-dd HH:mm:ss}|{(isBlacklisted ? "BLACKLISTED" : "Allowed")}";
                                    _eventLog.WriteEntry($"[Started] {processData}");
                                    ApiLogger.Log("ProcessStart", processData);

                                    if (isBlacklisted)
                                    {
                                        _eventLog.WriteEntry($"BLACKLISTED APPLICATION DETECTED: {process.ProcessName}", EventLogEntryType.Warning);
                                    }
                                }

                                currentProcessIds.Add(process.Id);
                            }

                            var endedProcesses = _trackedProcesses.Where(p => !currentProcessIds.Contains(p.Key)).ToList();

                            foreach (var trackedProcess in endedProcesses)
                            {
                                string processData = $"{trackedProcess.Value.ProcessName}|{trackedProcess.Value.WindowTitle}|Ended at {DateTime.Now:yyyy-MM-dd HH:mm:ss}|{(trackedProcess.Value.IsBlacklisted ? "BLACKLISTED" : "Allowed")}";
                                _eventLog.WriteEntry($"[Ended] {processData}");
                                ApiLogger.Log("ProcessEnd", processData);

                                _trackedProcesses.Remove(trackedProcess.Key);
                            }
                        }
                        catch (Exception ex)
                        {
                            _eventLog.WriteEntry("Error in process monitoring: " + ex.Message, EventLogEntryType.Error);
                        }

                        Thread.Sleep(5000);
                    }
                }
                catch (Exception ex)
                {
                    _eventLog.WriteEntry("Fatal error in process monitoring thread: " + ex.Message, EventLogEntryType.Error);
                }
            });

            _processMonitoringThread.IsBackground = true;
            _processMonitoringThread.Start();
        }

        public void StopProcessMonitoring()
        {
            if (!_isRunning)
            {
                _eventLog.WriteEntry("Process monitoring is not running.", EventLogEntryType.Warning);
                return;
            }

            try
            {
                _isRunning = false;
                if (_processMonitoringThread != null && _processMonitoringThread.IsAlive)
                {
                    _processMonitoringThread.Join(5000); // Wait up to 5 seconds for the thread to finish
                }
                _eventLog.WriteEntry("Process monitoring stopped.");
            }
            catch (Exception ex)
            {
                _eventLog.WriteEntry($"Error stopping process monitoring: {ex.Message}", EventLogEntryType.Error);
            }
        }

        private bool IsRelevantProcess(string processName, string windowTitle)
        {
            // Only check if the process is blacklisted
            return _blacklistedApplications.Contains(processName.ToLower());
        }
    }
}