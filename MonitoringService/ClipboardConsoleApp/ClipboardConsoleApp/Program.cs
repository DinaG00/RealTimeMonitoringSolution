using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace ClipboardMonitorConsoleApp
{
    class ClipboardMonitorForm : Form
    {
        private static string _lastClipboardText = "";

        // Windows API Import
        [DllImport("user32.dll")]
        private static extern bool AddClipboardFormatListener(IntPtr hwnd);

        private const int WM_CLIPBOARDUPDATE = 0x031D;
        private static readonly string DirectoryPath = @"C:\Users\Dina\Documents\CSIE\licenta\application\RealTimeMonitoryingSolution\MonitoringService\ClipboardLogs";

        public ClipboardMonitorForm()
        {
            AddClipboardFormatListener(this.Handle);
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_CLIPBOARDUPDATE)
            {
                HandleClipboardChange();
            }
            base.WndProc(ref m);
        }

        private void HandleClipboardChange()
        {
            try
            {
                if (Clipboard.ContainsText())
                {
                    string currentClipboardText = Clipboard.GetText();
                    //verify if the clipboard was used
                    if (currentClipboardText != _lastClipboardText)
                    {
                        _lastClipboardText = currentClipboardText;
                        SaveClipboardToFile(currentClipboardText);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error handling clipboard: " + ex.Message);
            }
        }

        private void SaveClipboardToFile(string content)
        {
            try
            {
                // Creating teh directory if it doesn't exist
                if (!Directory.Exists(DirectoryPath))
                {
                    Directory.CreateDirectory(DirectoryPath);
                }

                string filePath = Path.Combine(DirectoryPath, $"Clipboard_{DateTime.Now:yyyyMMdd_HHmmss}.txt");
                File.WriteAllText(filePath, content);
                //Console.WriteLine("Clipboard content saved to: " + filePath);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error saving clipboard content: " + ex.Message);
            }
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new ClipboardMonitorForm());
        }
    }
}
