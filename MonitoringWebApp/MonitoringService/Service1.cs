using System;
using System.ServiceProcess;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;

namespace MonitoringService
{
    public partial class Service1 : ServiceBase
    {
        private Process clipboardProcess;
        private ApiLogger apiLogger;

        public Service1()
        {
            InitializeComponent();
            apiLogger = new ApiLogger();
        }

        protected override void OnStart(string[] args)
        {
            StartClipboardMonitoringConsoleApp();
        }

        protected override void OnStop()
        {
            if (clipboardProcess != null && !clipboardProcess.HasExited)
            {
                clipboardProcess.Kill();
                clipboardProcess.Dispose();
            }
        }

        private void StartClipboardMonitoringConsoleApp()
        {
            try
            {
                string consoleAppPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ClipboardConsoleApp.exe");
                
                if (!File.Exists(consoleAppPath))
                {
                    EventLog.WriteEntry("MonitoringService", $"Clipboard console app not found at: {consoleAppPath}", EventLogEntryType.Error);
                    return;
                }

                ProcessStartInfo startInfo = new ProcessStartInfo();
                startInfo.FileName = consoleAppPath;
                startInfo.Arguments = "--launch-user"; // Signal to launch in user session
                startInfo.UseShellExecute = true;
                startInfo.WindowStyle = ProcessWindowStyle.Hidden;

                clipboardProcess = Process.Start(startInfo);
                
                if (clipboardProcess != null)
                {
                    EventLog.WriteEntry("MonitoringService", $"Started clipboard monitoring process with ID: {clipboardProcess.Id}", EventLogEntryType.Information);
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
    }
} 