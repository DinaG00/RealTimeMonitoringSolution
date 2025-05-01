using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;

namespace MonitoringService
{
    public class ProcessMonitor
    {
        private Thread _processMonitoringThread;
        private Dictionary<int, TrackedProcess> _trackedProcesses;
        private EventLog _eventLog;
        private bool _isRunning;

        public ProcessMonitor()
        {
            _eventLog = new EventLog();
            _eventLog.Source = "ProcessMonitoringService";
            _trackedProcesses = new Dictionary<int, TrackedProcess>();
            _isRunning = false;
        }

        public void StartProcessMonitoring()
        {
            if (_isRunning)
            {
                _eventLog.WriteEntry("Process monitoring is already running.", EventLogEntryType.Warning);
                return;
            }

            //LaunchChromeWithDebugging();

            _processMonitoringThread = new Thread(() =>
            {
                try
                {
                    _isRunning = true;
                    _eventLog.WriteEntry("Process monitoring started.");

                    while (_isRunning)
                    {
                        try
                        {
                            var currentProcesses = Process.GetProcesses();
                            //LogChromeTabs();  
                            var currentProcessIds = new HashSet<int>();

                            foreach (var process in currentProcesses)
                            {
                                if (process.SessionId == 0 || string.IsNullOrEmpty(process.ProcessName))
                                    continue;

                                string windowTitle = process.MainWindowTitle;
                                if (string.IsNullOrWhiteSpace(windowTitle))
                                    windowTitle = "(No window title)";

                                if (IsRelevantProcess(process.ProcessName, windowTitle) && !_trackedProcesses.ContainsKey(process.Id))
                                {
                                    var trackedProcess = new TrackedProcess
                                    {
                                        Id = process.Id,
                                        ProcessName = process.ProcessName,
                                        WindowTitle = windowTitle,
                                        StartTime = DateTime.Now
                                    };

                                    _trackedProcesses.Add(process.Id, trackedProcess);

                                    string processData = $"{trackedProcess.ProcessName}|{trackedProcess.WindowTitle}|Started at {trackedProcess.StartTime:yyyy-MM-dd HH:mm:ss}";
                                    _eventLog.WriteEntry($"[Started] {processData}");
                                    ApiLogger.Log("ProcessStart", processData);
                                }

                                currentProcessIds.Add(process.Id);
                            }

                            var endedProcesses = _trackedProcesses.Where(p => !currentProcessIds.Contains(p.Key)).ToList();

                            foreach (var trackedProcess in endedProcesses)
                            {
                                if (IsRelevantProcess(trackedProcess.Value.ProcessName, trackedProcess.Value.WindowTitle))
                                {
                                    string processData = $"{trackedProcess.Value.ProcessName}|{trackedProcess.Value.WindowTitle}|Ended at {DateTime.Now:yyyy-MM-dd HH:mm:ss}";
                                    _eventLog.WriteEntry($"[Ended] {processData}");
                                    ApiLogger.Log("ProcessEnd", processData);
                                }

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
                _processMonitoringThread?.Abort();
                _isRunning = false;
                _eventLog.WriteEntry("Process monitoring stopped.");
            }
            catch (Exception ex)
            {
                _eventLog.WriteEntry("Error stopping process monitoring: " + ex.Message, EventLogEntryType.Error);
            }
        }

        private bool IsRelevantProcess(string processName, string windowTitle)
        {
            var relevantProcessNames = new HashSet<string>
            {
                "teamviewer", "anydesk", "rustdesk", "ultraviewer", "vnc", "zoom", "skype", "teams", "meet",
                "virtualbox", "vmware", "bluestacks", "nox", "genymotion", "qemu", "sandboxie",
                "code", "sublime_text", "notepad++", "pycharm", "intellij", "eclipse", "androidstudio",
                "msedge", "firefox", "brave", "opera", "vivaldi",
                 "powershell", "python", "java", "node", "bash", "wscript", "cscript",
                "ditto", "clipboardfusion", "clipboardmanager", "snagit", "lightshot", "notepad", "word",
                "discord", "slack", "telegram", "whatsapp", "signal", "messenger",
                "obs", "xsplit", "bandicam", "snippingtool", "lightshot", "sharex", "shadowplay",
                "autohotkey", "macrorecorder", "jitbit"
            };
            return relevantProcessNames.Contains(processName.ToLower());
        }

        //private void LaunchChromeWithDebugging()
        //{
        //    try
        //    {
        //        var chromePath = GetChromePath();
        //        if (chromePath == null)
        //        {
        //            _eventLog.WriteEntry("Chrome not found on this system.", EventLogEntryType.Warning);
        //            return;
        //        }

        //        var startInfo = new ProcessStartInfo
        //        {
        //            FileName = chromePath,
        //            Arguments = "--remote-debugging-port=9222 --new-window --no-first-run --no-default-browser-check",
        //            UseShellExecute = false,
        //            CreateNoWindow = true
        //        };

        //        Process.Start(startInfo);
        //        _eventLog.WriteEntry("Launched Chrome with remote debugging enabled.", EventLogEntryType.Information);
        //    }
        //    catch (Exception ex)
        //    {
        //        _eventLog.WriteEntry("Failed to launch Chrome: " + ex.Message, EventLogEntryType.Error);
        //    }
        //}


        //private string GetChromePath()
        //{
        //    string[] possiblePaths =
        //    {
        //        Environment.ExpandEnvironmentVariables(@"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        //        Environment.ExpandEnvironmentVariables(@"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        //        Environment.ExpandEnvironmentVariables(@"%LocalAppData%\Google\Chrome\Application\chrome.exe")
        //    };

        //    return possiblePaths.FirstOrDefault(File.Exists);
        //}
        //private void LogChromeTabs()
        //{
        //    try
        //    {
        //        using (var client = new System.Net.WebClient())
        //        {
        //            string json = client.DownloadString("http://localhost:9222/json");
        //            if (!string.IsNullOrEmpty(json))
        //            {
        //                var matches = System.Text.RegularExpressions.Regex.Matches(json, "\"title\":\"(.*?)\",\"url\":\"(.*?)\"");
        //                foreach (System.Text.RegularExpressions.Match match in matches)
        //                {
        //                    string title = match.Groups[1].Value;
        //                    string url = match.Groups[2].Value;

        //                    string logEntry = $"Chrome Tab - Title: {title}, URL: {url}";
        //                    _eventLog.WriteEntry(logEntry, EventLogEntryType.Information);
        //                    ApiLogger.Log("ProcessStart", $"chrome|{title} - {url}|Detected Chrome tab");
        //                }
        //            }
        //        }
        //    }
        //    catch (Exception ex)
        //    {
        //        _eventLog.WriteEntry("Error fetching Chrome tabs: " + ex.Message, EventLogEntryType.Error);
        //    }
        //}

    }
}
