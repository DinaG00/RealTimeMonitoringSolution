using System;
using System.Diagnostics;
using System.Management;
using System.Media;
using System.ServiceProcess;
using System.Threading;

namespace MonitoringService
{
    public partial class Service1 : ServiceBase
    {
        private ManagementEventWatcher _usbWatcher;  // Watcher for USB insertions

        public Service1()
        {
            InitializeComponent();
            this.ServiceName = "UsbDetectionService";
        }

        protected override void OnStart(string[] args)
        {
            try
            {
                // Start the USB detection logic
                EventLog.WriteEntry("USB Detection Service is starting...");

                WqlEventQuery query = new WqlEventQuery("SELECT * FROM Win32_VolumeChangeEvent WHERE EventType = 2"); // EventType 2 is USB inserted
                _usbWatcher = new ManagementEventWatcher(query);
                _usbWatcher.EventArrived += OnUsbInserted;  // Event handler when USB inserted
                _usbWatcher.Start();

                EventLog.WriteEntry("USB Detection Service has started successfully.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error in OnStart: " + ex.Message, EventLogEntryType.Error);
            }
        }

        private void OnUsbInserted(object sender, EventArrivedEventArgs e)
        {
            // Event log for USB insered
            EventLog.WriteEntry("USB Device Inserted!");

            // Play warning sound for 5 seconds
            PlayBeepSoundForFiveSeconds();
        }

        private void PlayBeepSoundForFiveSeconds()
        {
            try
            {
                using (SoundPlayer player = new SoundPlayer(@"C:\Users\Dina\Documents\CSIE\licenta\application\RealTimeMonitoryingSolution\MonitoringService\warning-sound.wav"))
                {
                    player.Play();  // Start playing asynchronously
                    Thread.Sleep(5000); // Keep playing for 5 seconds
                    player.Stop(); 
                }
                EventLog.WriteEntry("Beep sound played for 5 seconds.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error playing beep sound: " + ex.Message, EventLogEntryType.Error);
            }
        }

        protected override void OnStop()
        {
            try
            {
                EventLog.WriteEntry("USB Detection Service is stopping...");

                if (_usbWatcher != null)
                {
                    _usbWatcher.Stop();
                    _usbWatcher.Dispose();
                }

                EventLog.WriteEntry("USB Detection Service has stopped.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error in OnStop: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
}
