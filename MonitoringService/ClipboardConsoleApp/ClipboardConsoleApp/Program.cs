using System;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text;
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
                        SaveClipboardToDatabase(currentClipboardText);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error handling clipboard: " + ex.Message);
            }
        }

        private async void SaveClipboardToDatabase(string content)
        {
            try
            {
                using (HttpClient client = new HttpClient())
                {
                    var json = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        content = content,
                        pc = Environment.MachineName
                    });

                    var contentData = new StringContent(json, Encoding.UTF8, "application/json");
                    Console.WriteLine("Sending to server...");
                    var response = await client.PostAsync("http://localhost:5001/logs/clipboard", contentData);

                    if (!response.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"Failed to send clipboard data: {response.StatusCode}");
                        var errorContent = await response.Content.ReadAsStringAsync();
                        Console.WriteLine($"Error details: {errorContent}");
                    }
                    else
                    {
                        Console.WriteLine($"Successfully sent clipboard content: {content.Substring(0, Math.Min(50, content.Length))}...");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending to server: {ex.Message}\nStack trace: {ex.StackTrace}");
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