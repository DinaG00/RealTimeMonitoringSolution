using System;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace MonitoringService
{
    public static class ApiLogger
    {
        // Use a static HttpClient with proper timeout and configuration
        private static readonly HttpClient client;

        static ApiLogger()
        {
            // Configure HttpClient with a timeout of 30 seconds
            client = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(30)
            };
        }

        public static void Log(string type, string data)
        {
            EventLog.WriteEntry("ApiLogger", $"Attempting to log {type} event with data: {data}", EventLogEntryType.Information);
            _ = SendLogAsync(type, data);
        }

        private static async Task SendLogAsync(string type, string data)
        {
            try
            {
                string url = GetUrlForType(type);
                EventLog.WriteEntry("ApiLogger", $"Sending {type} log to {url}", EventLogEntryType.Information);

                // Parse the data string into appropriate format
                object logData;
                switch (type)
                {
                    case "USB":
                        // For USB, we'll use the PC name as pc_id and set a fixed action
                        logData = new
                        {
                            pc_id = Environment.MachineName,
                            action = "USB device inserted!"
                        };
                        break;

                    case "Clipboard":
                        if (string.IsNullOrEmpty(data))
                        {
                            EventLog.WriteEntry("ApiLogger", "Empty clipboard data received", EventLogEntryType.Warning);
                            return;
                        }
                        logData = new { content = data };
                        break;

                    case "ProcessStart":
                    case "ProcessEnd":
                        EventLog.WriteEntry("ApiLogger", $"Processing {type} event with data: {data}", EventLogEntryType.Information);

                        // Split the data based on "|"
                        var processParts = data.Split('|');

                        // Filter out unwanted processes and ensure proper format
                        if (processParts.Length < 2 || string.IsNullOrWhiteSpace(processParts[0]))
                        {
                            EventLog.WriteEntry("ApiLogger", $"Invalid process data format. Expected at least 2 parts and a non-empty process name, got {processParts.Length}. Data: {data}", EventLogEntryType.Warning);
                            return;
                        }

                        string processName = processParts[0].Trim();
                        string windowTitle = processParts.Length > 1 ? processParts[1].Trim() : "";

                        // Only log if process name is valid
                        if (string.IsNullOrEmpty(processName) || processName.Equals("Idle", StringComparison.OrdinalIgnoreCase))
                        {
                            EventLog.WriteEntry("ApiLogger", $"Skipping unwanted process (process name: {processName})", EventLogEntryType.Information);
                            return;
                        }

                        var now = DateTime.Now;
                        logData = new
                        {
                            process_name = processName,
                            window_title = windowTitle,
                            action = type,
                            start_time = type == "ProcessStart" ? now : (DateTime?)null,
                            end_time = type == "ProcessEnd" ? now : (DateTime?)null
                        };

                        EventLog.WriteEntry("ApiLogger", $"Created process log data: {System.Text.Json.JsonSerializer.Serialize(logData)}", EventLogEntryType.Information);
                        break;

                    default:
                        EventLog.WriteEntry("ApiLogger", $"Unknown log type: {type}", EventLogEntryType.Warning);
                        logData = new { data };
                        break;
                }

                // Serialize the log data to JSON
                var json = System.Text.Json.JsonSerializer.Serialize(logData);
                EventLog.WriteEntry("ApiLogger", $"Request content: {json}", EventLogEntryType.Information);

                // Create and send the HTTP request
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                EventLog.WriteEntry("ApiLogger", "Sending HTTP request...", EventLogEntryType.Information);

                var response = await client.PostAsync(url, content);

                // Log the response content for debugging
                var responseContent = await response.Content.ReadAsStringAsync();
                EventLog.WriteEntry("ApiLogger", $"Received response: {responseContent}", EventLogEntryType.Information);

                // Handle API response
                if (!response.IsSuccessStatusCode)
                {
                    EventLog.WriteEntry("ApiLogger", $"API returned {response.StatusCode}: {responseContent}", EventLogEntryType.Warning);
                    throw new Exception($"API returned {response.StatusCode}: {responseContent}");
                }
                else
                {
                    EventLog.WriteEntry("ApiLogger", $"Successfully logged {type} event. Response: {responseContent}", EventLogEntryType.Information);
                }
            }
            catch (HttpRequestException ex)
            {
                EventLog.WriteEntry("ApiLogger", $"HTTP request error: {ex.Message}\nStack trace: {ex.StackTrace}", EventLogEntryType.Error);
            }
            catch (TimeoutException ex)
            {
                EventLog.WriteEntry("ApiLogger", $"Request timeout: {ex.Message}\nStack trace: {ex.StackTrace}", EventLogEntryType.Error);
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("ApiLogger", $"Failed to send log to API: {ex.Message}\nStack trace: {ex.StackTrace}", EventLogEntryType.Error);
            }
        }

        private static string GetUrlForType(string type)
        {
            if (type == "USB")
                return "http://localhost:5001/logs/usb";
            else if (type == "Clipboard")
                return "http://localhost:5001/logs/clipboard";
            else if (type == "ProcessStart" || type == "ProcessEnd")
                return "http://localhost:5001/logs/process";
            else
                return "http://localhost:5001/logs/general";
        }

        // Dispose of the HttpClient instance properly when done
        public static void Dispose()
        {
            client.Dispose();
        }
    }
}
