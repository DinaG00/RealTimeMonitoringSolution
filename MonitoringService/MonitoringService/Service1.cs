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
                FileWriter.WriteTestFile(); // Debugging permission test
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
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = consoleAppPath,
                    UseShellExecute = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };

                _clipboardProcess = Process.Start(startInfo);

                if (_clipboardProcess != null && !_clipboardProcess.HasExited)
                {
                    EventLog.WriteEntry("Clipboard monitoring console app started successfully with PID: " + _clipboardProcess.Id);
                }
                else
                {
                    EventLog.WriteEntry("Clipboard monitoring console app failed to start.", EventLogEntryType.Warning);
                }
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error starting clipboard monitoring console app: " + ex.Message, EventLogEntryType.Error);
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

    public static class FileWriter
    {
        public static void WriteTestFile()
        {
            try
            {
                string filePath = @"C:\Users\Dina\Documents\CSIE\licenta\application\RealTimeMonitoryingSolution\MonitoringService\test";
                Directory.CreateDirectory(Path.GetDirectoryName(filePath));
                File.WriteAllText(filePath, "This is a test file written by the service.");
                EventLog.WriteEntry("FileWriter", "Test file written successfully at: " + filePath);
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("FileWriter", "Error writing test file: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
}
