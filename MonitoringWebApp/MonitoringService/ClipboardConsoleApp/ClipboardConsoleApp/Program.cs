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

        public ClipboardMonitorForm()
        {
            AddClipboardFormatListener(this.Handle);
            Console.WriteLine("Clipboard monitoring started...");
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
                    if (currentClipboardText != _lastClipboardText)
                    {
                        _lastClipboardText = currentClipboardText;
                        SaveClipboardToServer(currentClipboardText);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error handling clipboard: {ex.Message}");
            }
        }

        private async void SaveClipboardToServer(string content)
        {
            try
            {
                using (HttpClient client = new HttpClient())
                {
                    var json = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        content = content
                    });

                    var contentData = new StringContent(json, Encoding.UTF8, "application/json");
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
                Console.WriteLine($"Error sending clipboard content: {ex.Message}");
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
            Console.WriteLine("Starting clipboard monitor...");
            Application.Run(new ClipboardMonitorForm());
        }
    }
} 