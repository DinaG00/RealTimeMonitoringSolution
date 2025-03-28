using System;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace MonitoringService
{
    public static class ApiLogger
    {
        private static readonly HttpClient client = new HttpClient();

        public static void Log(string type, string data)
        {
            _ = SendLogAsync(type, data);
        }

        private static async Task SendLogAsync(string type, string data)
        {
            try
            {
                var json = System.Text.Json.JsonSerializer.Serialize(new { pc = type, data });
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await client.PostAsync("http://localhost:5001/logs/usb", content);

                // Check if request was successful
                if (!response.IsSuccessStatusCode)
                {
                    var errorMessage = await response.Content.ReadAsStringAsync();
                    EventLog.WriteEntry("ApiLogger", $"API returned {response.StatusCode}: {errorMessage}", EventLogEntryType.Warning);
                    throw new Exception($"API returned {response.StatusCode}: {errorMessage}");
                }
                else
                {
                    // Log successful API call
                    EventLog.WriteEntry("ApiLogger", $"Successfully logged {type} event: {data}", EventLogEntryType.Information);
                }
            }
            catch (Exception ex)
            {
                // Log to EventLog if API fails
                EventLog.WriteEntry("ApiLogger", "Failed to send log to API: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
} 