using System;
using System.Diagnostics;
using System.Net.Http;
using System.ServiceProcess;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading;
using Newtonsoft.Json;
using System.Configuration;

namespace MonitoringService
{
    public partial class Service1 : ServiceBase
    {
        private UsbMonitor _usbMonitor;
        private ClipboardMonitor _clipboardMonitor;
        private ProcessMonitor _processMonitor;
        private DownloadsMonitor _downloadsMonitor;
        private Timer _heartbeatTimer;
        private readonly string backendBaseUrl = ConfigurationManager.AppSettings["BackendBaseUrl"];

        public Service1()
        {
            InitializeComponent();
            this.ServiceName = "DetectionService";
        }

        private void EnsureEventLogSources()
        {
            string[] sources = { "DetectionService", "ApiLogger", "DownloadsMonitor" };

            foreach (var source in sources)
            {
                if (!EventLog.SourceExists(source))
                {
                    EventLog.CreateEventSource(source, "Application");
                }
            }
        }

        protected override void OnStart(string[] args)
        {
            try
            {
                EnsureEventLogSources();
                EventLog.WriteEntry("DetectionService", "Service is starting...");

                _usbMonitor = new UsbMonitor();
                _usbMonitor.StartUsbDetection();

                _clipboardMonitor = new ClipboardMonitor();
                _clipboardMonitor.StartClipboardMonitoring();

                _processMonitor = new ProcessMonitor();
                _processMonitor.StartProcessMonitoring();

                _downloadsMonitor = new DownloadsMonitor();
                _downloadsMonitor.StartMonitoring();

                _heartbeatTimer = new Timer(SendHeartbeatCallback, null, 0, 60000); // every 5 minutes

                EventLog.WriteEntry("DetectionService", "Service has started successfully.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("DetectionService", "Error in OnStart: " + ex.Message, EventLogEntryType.Error);
            }
        }

        private void SendHeartbeatCallback(object state)
        {
            try
            {
                SendHeartbeat().GetAwaiter().GetResult();
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("DetectionService", "Error in SendHeartbeatCallback: " + ex.Message, EventLogEntryType.Error);
            }
        }

        private async System.Threading.Tasks.Task SendHeartbeat()
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var pcName = Environment.MachineName;
                    var payload = new { pc_name = pcName };
                    var json = JsonConvert.SerializeObject(payload);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                    var response = await client.PostAsync($"{backendBaseUrl}/pcs/heartbeat", content);
                    if (!response.IsSuccessStatusCode)
                    {
                        EventLog.WriteEntry("DetectionService", $"Failed to send heartbeat: {response.StatusCode}");
                    }
                }
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("DetectionService", "Error sending heartbeat: " + ex.Message, EventLogEntryType.Error);
            }
        }

        protected override void OnStop()
        {
            try
            {
                EventLog.WriteEntry("DetectionService", "Service is stopping...");

                _usbMonitor?.StopUsbDetection();
                _clipboardMonitor?.StopClipboardMonitoring();
                _processMonitor?.StopProcessMonitoring();
                _downloadsMonitor?.StopMonitoring();
                _heartbeatTimer?.Dispose();

                EventLog.WriteEntry("DetectionService", "Service has stopped.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("DetectionService", "Error in OnStop: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
}
