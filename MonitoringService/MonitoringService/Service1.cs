using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Media;
using System.ServiceProcess;
using System.Threading;
using System.Linq;

namespace MonitoringService
{
    public partial class Service1 : ServiceBase
    {
        private Thread _usbWatcherThread;
        private ManagementEventWatcher _usbWatcher;
        private Process _clipboardProcess;
        private Thread _processWatcherThread;
        private volatile bool _isRunning;

        private Dictionary<int, TrackedProcess> _trackedProcesses = new Dictionary<int, TrackedProcess>();

        public Service1()
        {
            InitializeComponent();
            this.ServiceName = "UsbAndClipboardDetectionService";
        }

        protected override void OnStart(string[] args)
        {
            try
            {
                EventLog.WriteEntry("Service is starting...");
                StartUsbDetection();
                StartClipboardMonitoringConsoleApp();
                StartProcessMonitoring();
                EventLog.WriteEntry("Service has started successfully.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error in OnStart: " + ex.Message, EventLogEntryType.Error);
            }
        }

        private void StartUsbDetection()
        {
            _usbWatcherThread = new Thread(() =>
            {
                try
                {
                    WqlEventQuery query = new WqlEventQuery("SELECT * FROM Win32_VolumeChangeEvent WHERE EventType = 2");
                    _usbWatcher = new ManagementEventWatcher(query);
                    _usbWatcher.EventArrived += OnUsbInserted;
                    _usbWatcher.Start();
                    EventLog.WriteEntry("USB detection started.");
                }
                catch (Exception ex)
                {
                    EventLog.WriteEntry("Error in USB detection thread: " + ex.Message, EventLogEntryType.Error);
                }
            });

            _usbWatcherThread.IsBackground = true;
            _usbWatcherThread.Start();
        }

        private void OnUsbInserted(object sender, EventArrivedEventArgs e)
        {
            EventLog.WriteEntry("USB Device Inserted!");
            ApiLogger.Log("USB", "USB Device Inserted!");
            PlayBeepSoundForFiveSeconds();
        }

        private void PlayBeepSoundForFiveSeconds()
        {
            try
            {
                using (SoundPlayer player = new SoundPlayer(@"C:\Users\Dina\Documents\CSIE\licenta\application\RealTimeMonitoryingSolution\MonitoringService\warning-sound.wav"))
                {
                    player.Play();
                    Thread.Sleep(5000);
                    player.Stop();
                }
                EventLog.WriteEntry("Beep sound played for 5 seconds.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error playing beep sound: " + ex.Message, EventLogEntryType.Error);
            }
        }

        private void StartClipboardMonitoringConsoleApp()
        {
            try
            {
                string consoleAppPath = @"C:\Users\Dina\Documents\CSIE\licenta\application\RealTimeMonitoryingSolution\MonitoringService\ClipboardConsoleApp\ClipboardConsoleApp\bin\Debug\ClipboardConsoleApp.exe";
                EventLog.WriteEntry("MonitoringService", $"Attempting to start clipboard monitoring from path: {consoleAppPath}", EventLogEntryType.Information);

                if (!File.Exists(consoleAppPath))
                {
                    EventLog.WriteEntry("MonitoringService", $"Clipboard monitoring app not found at: {consoleAppPath}", EventLogEntryType.Error);
                    return;
                }

                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = consoleAppPath,
                    UseShellExecute = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };

                Process clipboardProcess = Process.Start(startInfo);
                if (clipboardProcess != null)
                {
                    EventLog.WriteEntry("MonitoringService", $"Clipboard monitoring process started with ID: {clipboardProcess.Id}", EventLogEntryType.Information);
                    _clipboardProcess = clipboardProcess;
                }
                else
                {
                    EventLog.WriteEntry("MonitoringService", "Failed to start clipboard monitoring process", EventLogEntryType.Error);
                }
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("MonitoringService", $"Error starting clipboard monitoring: {ex.Message}", EventLogEntryType.Error);
            }
        }

        private bool ShouldSkipProcess(Process process)
        {
            var excludedProcesses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "Idle", // 'Idle' process is irrelevant
        "System", // 'System' process is irrelevant
        "svchost", // 'svchost' is a system process
        "conhost", // 'conhost' (console host) processes are background
        "dllhost", // 'dllhost' processes are system-related
        "explorer", // 'explorer' is Windows Explorer, not useful for monitoring
        "cmd", // 'cmd' is the command prompt, not relevant unless you are looking at commands
        "powershell" // 'powershell' may not be necessary unless you're tracking scripts
    };

            return excludedProcesses.Contains(process.ProcessName);
        }

        private void StartProcessMonitoring()
        {
            _isRunning = true;

            _processWatcherThread = new Thread(() =>
            {
                try
                {
                    EventLog.WriteEntry("MonitoringService", "Process monitoring started.", EventLogEntryType.Information);

                    while (_isRunning)
                    {
                        try
                        {
                            var currentProcesses = Process.GetProcesses();
                            var currentProcessIds = new HashSet<int>();

                            foreach (var process in currentProcesses)
                            {
                                try
                                {
                                    // Skip if the process should be excluded
                                    if (ShouldSkipProcess(process))
                                    {
                                        continue;
                                    }

                                    // Only user session processes (process.SessionId == 0 is typically the system session)
                                    if (process.SessionId == 0)
                                        continue;

                                    if (string.IsNullOrEmpty(process.ProcessName))
                                        continue;

                                    string windowTitle = process.MainWindowTitle;
                                    if (string.IsNullOrWhiteSpace(windowTitle))
                                    {
                                        windowTitle = "(No window title)";
                                    }

                                    // If the process is Chrome, check if there's a specific window title (a tab)
                                    if (process.ProcessName.Equals("chrome", StringComparison.OrdinalIgnoreCase))
                                    {
                                        // You can capture the Chrome tab name here
                                        if (!string.IsNullOrEmpty(windowTitle) && windowTitle != "(No window title)")
                                        {
                                            // Log Chrome tab title with process name
                                            string processData = $"{process.ProcessName}|{windowTitle}|Started at {DateTime.Now:yyyy-MM-dd HH:mm:ss}";
                                            EventLog.WriteEntry("MonitoringService", $"[Started] {processData}", EventLogEntryType.Information);
                                            ApiLogger.Log("ProcessStart", processData);
                                        }
                                    }
                                    else
                                    {
                                        // For all other processes, use their main window title
                                        if (!_trackedProcesses.ContainsKey(process.Id))
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
                                            EventLog.WriteEntry("MonitoringService", $"[Started] {processData}", EventLogEntryType.Information);

                                            ApiLogger.Log("ProcessStart", processData);
                                        }
                                    }

                                    currentProcessIds.Add(process.Id);
                                }
                                catch (Exception ex)
                                {
                                    EventLog.WriteEntry("MonitoringService", $"Error checking process: {ex.Message}", EventLogEntryType.Warning);
                                }
                            }

                            // Detect ended processes
                            var endedProcesses = new List<int>();

                            foreach (var trackedProcess in _trackedProcesses)
                            {
                                if (!currentProcessIds.Contains(trackedProcess.Key))
                                {
                                    string processData = $"{trackedProcess.Value.ProcessName}|{trackedProcess.Value.WindowTitle}|Ended at {DateTime.Now:yyyy-MM-dd HH:mm:ss}";
                                    EventLog.WriteEntry("MonitoringService", $"[Ended] {processData}", EventLogEntryType.Information);

                                    ApiLogger.Log("ProcessEnd", processData);

                                    endedProcesses.Add(trackedProcess.Key);
                                }
                            }

                            foreach (var endedId in endedProcesses)
                            {
                                _trackedProcesses.Remove(endedId);
                            }
                        }
                        catch (Exception ex)
                        {
                            EventLog.WriteEntry("MonitoringService", "Error during process monitoring: " + ex.Message, EventLogEntryType.Error);
                        }

                        Thread.Sleep(5000); // Check every 5 seconds
                    }
                }
                catch (Exception ex)
                {
                    EventLog.WriteEntry("MonitoringService", "Fatal error in process monitoring thread: " + ex.Message, EventLogEntryType.Error);
                }
            });

            _processWatcherThread.IsBackground = true;
            _processWatcherThread.Start();
        }


        protected override void OnStop()
        {
            try
            {
                EventLog.WriteEntry("Service is stopping...");
                _isRunning = false;

                _usbWatcher?.Stop();
                _usbWatcher?.Dispose();

                if (_clipboardProcess != null && !_clipboardProcess.HasExited)
                {
                    _clipboardProcess.Kill();
                    _clipboardProcess.WaitForExit();
                    _clipboardProcess.Dispose();
                    EventLog.WriteEntry("Clipboard monitoring console app stopped.");
                }

                _processWatcherThread?.Join();

                EventLog.WriteEntry("Service has stopped.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error in OnStop: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
}
