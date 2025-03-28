using System;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Media;
using System.ServiceProcess;
using System.Threading;

namespace MonitoringService
{
    public partial class Service1 : ServiceBase
    {
        private Thread _usbWatcherThread;
        private ManagementEventWatcher _usbWatcher;
        private Process _clipboardProcess;

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
            ApiLogger.Log("Info", "USB Device Inserted!");
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
                string consoleAppPath = "C:\\Users\\Dina\\Documents\\CSIE\\licenta\\application\\RealTimeMonitoryingSolution\\MonitoringService\\ClipboardConsoleApp\\ClipboardConsoleApp\\bin\\Debug\\ClipboardConsoleApp.exe";
                EventLog.WriteEntry("MonitoringService", $"Attempting to start clipboard monitoring from path: {consoleAppPath}", EventLogEntryType.Information);

                if (!File.Exists(consoleAppPath))
                {
                    EventLog.WriteEntry("MonitoringService", $"Clipboard monitoring app not found at: {consoleAppPath}", EventLogEntryType.Error);
                    return;
                }

                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = consoleAppPath,
                    UseShellExecute = true, // This allows running in the user's session
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

        

        protected override void OnStop()
        {
            try
            {
                EventLog.WriteEntry("Service is stopping...");
                _usbWatcher?.Stop();
                _usbWatcher?.Dispose();

                if (_clipboardProcess != null && !_clipboardProcess.HasExited)
                {
                    _clipboardProcess.Kill();
                    _clipboardProcess.WaitForExit();
                    _clipboardProcess.Dispose();
                    EventLog.WriteEntry("Clipboard monitoring console app stopped.");
                }

                EventLog.WriteEntry("Service has stopped.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error in OnStop: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
}
