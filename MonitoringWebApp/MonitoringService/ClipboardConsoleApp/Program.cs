using System;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;
using System.Diagnostics;
using System.Security.Principal;
using Microsoft.Win32.SafeHandles;

namespace ClipboardMonitorConsoleApp
{
    class ClipboardMonitorForm : Form
    {
        [DllImport("user32.dll")]
        private static extern bool AddClipboardFormatListener(IntPtr hwnd);

        [DllImport("kernel32.dll")]
        private static extern int GetCurrentProcessId();

        [DllImport("wtsapi32.dll")]
        private static extern bool WTSQueryUserToken(uint sessionId, out IntPtr Token);

        [DllImport("kernel32.dll")]
        private static extern bool CloseHandle(IntPtr handle);

        [DllImport("kernel32.dll")]
        private static extern uint WTSGetActiveConsoleSessionId();

        [StructLayout(LayoutKind.Sequential)]
        public struct SECURITY_ATTRIBUTES
        {
            public int Length;
            public IntPtr lpSecurityDescriptor;
            public bool bInheritHandle;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct STARTUPINFO
        {
            public int cb;
            public string lpReserved;
            public string lpDesktop;
            public string lpTitle;
            public uint dwX;
            public uint dwY;
            public uint dwXSize;
            public uint dwYSize;
            public uint dwXCountChars;
            public uint dwYCountChars;
            public uint dwFillAttribute;
            public uint dwFlags;
            public short wShowWindow;
            public short cbReserved2;
            public IntPtr lpReserved2;
            public IntPtr hStdInput;
            public IntPtr hStdOutput;
            public IntPtr hStdError;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct PROCESS_INFORMATION
        {
            public IntPtr hProcess;
            public IntPtr hThread;
            public uint dwProcessId;
            public uint dwThreadId;
        }

        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool CreateProcessAsUser(
            IntPtr hToken,
            string lpApplicationName,
            string lpCommandLine,
            ref SECURITY_ATTRIBUTES lpProcessAttributes,
            ref SECURITY_ATTRIBUTES lpThreadAttributes,
            bool bInheritHandles,
            uint dwCreationFlags,
            IntPtr lpEnvironment,
            string lpCurrentDirectory,
            ref STARTUPINFO lpStartupInfo,
            out PROCESS_INFORMATION lpProcessInformation);

        private const int WM_CLIPBOARDUPDATE = 0x031D;
        private static string _lastClipboardText = "";

        public static bool LaunchInUserSession(string appPath)
        {
            uint sessionId = WTSGetActiveConsoleSessionId();
            IntPtr userToken = IntPtr.Zero;
            
            try
            {
                if (!WTSQueryUserToken(sessionId, out userToken))
                {
                    Console.WriteLine($"Failed to get user token. Error: {Marshal.GetLastWin32Error()}");
                    return false;
                }

                var processAttr = new SECURITY_ATTRIBUTES();
                var threadAttr = new SECURITY_ATTRIBUTES();
                var startupInfo = new STARTUPINFO();
                PROCESS_INFORMATION processInfo = new PROCESS_INFORMATION();

                processAttr.Length = Marshal.SizeOf(processAttr);
                threadAttr.Length = Marshal.SizeOf(threadAttr);
                startupInfo.cb = Marshal.SizeOf(startupInfo);
                startupInfo.lpDesktop = "winsta0\\default";

                bool result = CreateProcessAsUser(
                    userToken,
                    appPath,
                    null,
                    ref processAttr,
                    ref threadAttr,
                    false,
                    0,
                    IntPtr.Zero,
                    null,
                    ref startupInfo,
                    out processInfo);

                if (!result)
                {
                    Console.WriteLine($"Failed to create process. Error: {Marshal.GetLastWin32Error()}");
                    return false;
                }

                CloseHandle(processInfo.hProcess);
                CloseHandle(processInfo.hThread);
                return true;
            }
            finally
            {
                if (userToken != IntPtr.Zero)
                {
                    CloseHandle(userToken);
                }
            }
        }

        public ClipboardMonitorForm()
        {
            Console.WriteLine($"Starting clipboard monitor in process {GetCurrentProcessId()}");
            Console.WriteLine($"Running as user: {WindowsIdentity.GetCurrent().Name}");
            
            bool success = AddClipboardFormatListener(this.Handle);
            if (!success)
            {
                Console.WriteLine("Failed to register clipboard listener!");
            }
            else
            {
                Console.WriteLine("Successfully registered clipboard listener");
            }
            
            try
            {
                if (Clipboard.ContainsText())
                {
                    Console.WriteLine("Successfully accessed clipboard");
                    _lastClipboardText = Clipboard.GetText();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error accessing initial clipboard content: {ex.Message}");
            }
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_CLIPBOARDUPDATE)
            {
                Console.WriteLine("Received clipboard update event");
                try
                {
                    if (Clipboard.ContainsText())
                    {
                        string currentClipboardText = Clipboard.GetText();
                        Console.WriteLine($"Read clipboard text: {currentClipboardText.Substring(0, Math.Min(20, currentClipboardText.Length))}...");
                        
                        if (currentClipboardText != _lastClipboardText)
                        {
                            _lastClipboardText = currentClipboardText;
                            SendClipboardToServer(currentClipboardText);
                        }
                        else
                        {
                            Console.WriteLine("Clipboard content unchanged, skipping");
                        }
                    }
                    else
                    {
                        Console.WriteLine("Clipboard does not contain text");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error reading clipboard: {ex.Message}\nStack trace: {ex.StackTrace}");
                }
            }
            base.WndProc(ref m);
        }

        private async void SendClipboardToServer(string content)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var json = System.Text.Json.JsonSerializer.Serialize(new { content });
                    var httpContent = new StringContent(json, Encoding.UTF8, "application/json");
                    
                    Console.WriteLine("Sending to server...");
                    var response = await client.PostAsync("http://localhost:5001/logs/clipboard", httpContent);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"Successfully sent clipboard content: {content.Substring(0, Math.Min(50, content.Length))}...");
                    }
                    else
                    {
                        string errorContent = await response.Content.ReadAsStringAsync();
                        Console.WriteLine($"Server returned error {response.StatusCode}: {errorContent}");
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
        static void Main(string[] args)
        {
            if (args.Length > 0 && args[0] == "--launch-user")
            {
                string appPath = Process.GetCurrentProcess().MainModule.FileName;
                if (ClipboardMonitorForm.LaunchInUserSession(appPath))
                {
                    return;
                }
            }

            Console.WriteLine("Clipboard monitoring application starting...");
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            
            try
            {
                Application.Run(new ClipboardMonitorForm());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fatal error in clipboard monitor: {ex.Message}\nStack trace: {ex.StackTrace}");
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
            }
        }
    }
} 