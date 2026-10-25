// -----------------------------------------------------------------------------
// <copyright file="Program.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

var dbConn = Environment.GetEnvironmentVariable("CLOUD_DB_CONNECTION");
if (string.IsNullOrWhiteSpace(dbConn))
{
    var dataDir = Path.Combine(AppContext.BaseDirectory, "data");
    Directory.CreateDirectory(dataDir);
    Environment.SetEnvironmentVariable("CLOUD_DB_CONNECTION", $"Data Source={Path.Combine(dataDir, "razor_cloud.db")}");
}
else if (dbConn.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
{
    var filePath = dbConn["Data Source=".Length..].Trim();
    var dir = Path.GetDirectoryName(filePath);
    if (!string.IsNullOrEmpty(dir))
    {
        Directory.CreateDirectory(dir);
    }
}

if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("CLOUD_MANAGEMENT_API_KEY")))
{
    Environment.SetEnvironmentVariable("CLOUD_MANAGEMENT_API_KEY", "dev-cloud-management-key-3000");
}

var urls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
if (string.IsNullOrWhiteSpace(urls))
{
    Environment.SetEnvironmentVariable("ASPNETCORE_URLS", "http://0.0.0.0:5000;http://0.0.0.0:3000");
}
else if (!urls.Contains("3000"))
{
    Environment.SetEnvironmentVariable("ASPNETCORE_URLS", $"{urls};http://0.0.0.0:3000");
}

Console.WriteLine("==========================================================");
Console.WriteLine(" Razor Cloud Control Plane - Production Service (.NET 10) ");
Console.WriteLine($" Database: {Environment.GetEnvironmentVariable("CLOUD_DB_CONNECTION")}");
Console.WriteLine($" URLs:     {Environment.GetEnvironmentVariable("ASPNETCORE_URLS")}");
Console.WriteLine("==========================================================");

await Cloud.CloudApplication.RunAsync(args).ConfigureAwait(false);
