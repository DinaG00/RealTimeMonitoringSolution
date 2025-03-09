using System;
using System.IO;
using System.Threading;
using System.Windows.Forms;  // for  clipboard access

namespace ClipboardMonitorConsoleApp
{
    class Program
    {
        static string _lastClipboardText = "";

        static void Main(string[] args)
        {
            // Set the application to run in Single-Threaded Apartment (STA) mode for clipboard access
            Thread thread = new Thread(MonitorClipboard);
            thread.SetApartmentState(ApartmentState.STA);
            thread.Start();

            Console.WriteLine("Clipboard monitoring started. Press [Ctrl+C] to exit.");
            Console.ReadLine();
        }

        private static void MonitorClipboard()
        {
            while (true)
            {
                try
                {
                    if (Clipboard.ContainsText()) // Check if clipboard has text
                    {
                        string currentClipboardText = Clipboard.GetText();
                        if (currentClipboardText != _lastClipboardText) // If the clipboard content has changed
                        {
                            _lastClipboardText = currentClipboardText;

                            // Log clipboard content
                            Console.WriteLine("Clipboard copied: " + currentClipboardText);

                            //write the content to a file or send it to the service
                            SaveClipboardToFile(currentClipboardText);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Error monitoring clipboard: " + ex.Message);
                }

                Thread.Sleep(1000); // Check clipboard every second
            }
        }

        private static void SaveClipboardToFile(string content)
        {
            try
            {
                string filePath = $@"C:\Users\Dina\Documents\CSIE\licenta\application\RealTimeMonitoryingSolution\MonitoringService\ClipboardLogs\Clipboard_{DateTime.Now:yyyyMMdd_HHmmss}.txt";

                // Log the file path to ensure it is unique
                Console.WriteLine("Saving clipboard to file: " + filePath);

                // Ensure the directory exists
                Directory.CreateDirectory(Path.GetDirectoryName(filePath));

                // Write content to file
                File.WriteAllText(filePath, content);

                Console.WriteLine("Clipboard content saved to: " + filePath);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error saving clipboard content: " + ex.Message);
            }
        }

    }
}
