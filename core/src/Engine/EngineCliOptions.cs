// -----------------------------------------------------------------------------
// <copyright file="EngineCliOptions.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine;

using System.Diagnostics.CodeAnalysis;
using Core;
using Core.Exceptions;

/// <summary>
/// Encapsulates parsed command-line options and credentials for the Razor Engine host.
/// </summary>
internal sealed class EngineCliOptions
{
    public string? Endpoint { get; set; }
    public string? ApiKey { get; set; }
    public string? InstanceId { get; set; }
    public string? UserName { get; set; }
    public string? Password { get; set; }
    public string? EngineId { get; set; }
    public bool IsRestart { get; set; }
    public bool IsService { get; set; }
    public bool IsDevelopment { get; set; }

    /// <summary>
    /// Parses CLI arguments into an <see cref="EngineCliOptions"/> instance.
    /// Returns null if execution should terminate immediately (e.g. --help or --version).
    /// </summary>
    [SuppressMessage("Globalization", "CA1303:Do not pass literals as localized parameters",
        Justification = "Console output for CLI; no localization required.")]
    public static EngineCliOptions? Parse(string[] args)
    {
        if (args.Any(a => a.Equals("--help", StringComparison.OrdinalIgnoreCase) || a.Equals("-h", StringComparison.Ordinal)))
        {
            PrintHelp();
            return null;
        }

        if (args.Any(a => a.Equals("--version", StringComparison.OrdinalIgnoreCase) || a.Equals("-v", StringComparison.Ordinal)))
        {
            PrintVersion();
            return null;
        }

        var options = new EngineCliOptions();

        if (args.Any(a => a.Equals("--development", StringComparison.OrdinalIgnoreCase)))
        {
            options.IsDevelopment = true;
            RuntimeEnvironment.SetDevelopment(true);
        }

#if DEBUG
        options.IsDevelopment = true;
        RuntimeEnvironment.SetDevelopment(true);
#endif

        options.IsRestart = args.Any(a => a.Equals("--command=restart", StringComparison.OrdinalIgnoreCase));
        options.IsService = args.Any(a => a.Equals("--service", StringComparison.OrdinalIgnoreCase));

        for (int i = 0; i < args.Length; i++)
        {
            string arg = args[i];
            if (arg.StartsWith("--endpoint=", StringComparison.OrdinalIgnoreCase))
            {
                options.Endpoint = arg["--endpoint=".Length..];
            }
            else if (arg.Equals("--endpoint", StringComparison.OrdinalIgnoreCase) || arg.Equals("-e", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    options.Endpoint = args[++i];
                }
            }
            else if (arg.StartsWith("--cloud=", StringComparison.OrdinalIgnoreCase))
            {
                options.Endpoint = arg["--cloud=".Length..];
            }
            else if (arg.Equals("--cloud", StringComparison.OrdinalIgnoreCase) || arg.Equals("-c", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    options.Endpoint = args[++i];
                }
            }
            else if (arg.StartsWith("--key=", StringComparison.OrdinalIgnoreCase))
            {
                options.ApiKey = arg["--key=".Length..];
            }
            else if (arg.Equals("--key", StringComparison.OrdinalIgnoreCase) || arg.Equals("-k", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    options.ApiKey = args[++i];
                }
            }
            else if (arg.StartsWith("--apikey=", StringComparison.OrdinalIgnoreCase))
            {
                options.ApiKey = arg["--apikey=".Length..];
            }
            else if (arg.Equals("--apikey", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    options.ApiKey = args[++i];
                }
            }
            else if (arg.StartsWith("--instance=", StringComparison.OrdinalIgnoreCase))
            {
                options.InstanceId = arg["--instance=".Length..];
            }
            else if (arg.Equals("--instance", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    options.InstanceId = args[++i];
                }
            }
            else if (arg.StartsWith("--username=", StringComparison.OrdinalIgnoreCase))
            {
                options.UserName = arg["--username=".Length..];
            }
            else if (arg.Equals("--username", StringComparison.OrdinalIgnoreCase) || arg.Equals("-u", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    options.UserName = args[++i];
                }
            }
            else if (arg.StartsWith("--password=", StringComparison.OrdinalIgnoreCase))
            {
                options.Password = arg["--password=".Length..];
            }
            else if (arg.Equals("--password", StringComparison.OrdinalIgnoreCase) || arg.Equals("-p", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    options.Password = args[++i];
                }
            }
            else if (arg.StartsWith("--engine-id=", StringComparison.OrdinalIgnoreCase))
            {
                options.EngineId = arg["--engine-id=".Length..];
            }
            else if (arg.Equals("--engine-id", StringComparison.OrdinalIgnoreCase) || arg.Equals("-id", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length)
                {
                    options.EngineId = args[++i];
                }
            }
            else if (arg.StartsWith("--auth=", StringComparison.OrdinalIgnoreCase))
            {
                string authValue = arg["--auth=".Length..];
                string[] parts = authValue.Split(':');
                if (parts.Length != 3)
                {
                    parts = authValue.Split(',');
                }

                if (parts.Length == 3)
                {
                    options.UserName = parts[0];
                    options.Password = parts[1];
                    options.ApiKey = parts[2];
                }
            }
        }

        // Apply credentials
        Credentials.SetPartialCredentials(options.UserName, options.Password, options.ApiKey);

        // Apply endpoint
        if (!string.IsNullOrWhiteSpace(options.Endpoint))
        {
            string ep = options.Endpoint.Trim();
            if (ep.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                ep = "wss://" + ep["https://".Length..];
            }
            else if (ep.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            {
                ep = "ws://" + ep["http://".Length..];
            }

            if (!ep.EndsWith("/engine", StringComparison.OrdinalIgnoreCase))
            {
                ep = ep.TrimEnd('/') + "/engine";
            }

            options.Endpoint = ep;
            AppConstants.SetPrimaryEndpoint(ep);
            AppConstants.SetFallbackEndpoint(ep);
        }

        if (options.IsService && !Credentials.IsAvailable)
        {
            Console.WriteLine("[FATAL] When running as a service, credentials must be provided via --auth=user,pass,key or CLI flags.");
            Environment.ExitCode = 1;
            return null;
        }

        return options;
    }

    [SuppressMessage("Globalization", "CA1303:Do not pass literals as localized parameters",
        Justification = "Console output for CLI help; no localization required.")]
    public static void PrintHelp()
    {
        Console.WriteLine("Razor Engine v" + AppConstants.EngineVersion);
        Console.WriteLine("Usage: Engine [options]");
        Console.WriteLine("Options:");
        Console.WriteLine("  --endpoint=<url>, -e <url>       Cloud control plane WebSocket URL (default: ws://localhost:5000/engine)");
        Console.WriteLine("  --instance=<id>                  Instance UUID to bind to");
        Console.WriteLine("  --key=<key>, -k <key>            Instance API key issued by Cloud");
        Console.WriteLine("  --username=<name>, -u <name>     Cloud operator/trader username");
        Console.WriteLine("  --password=<pass>, -p <pass>     Cloud operator/trader password");
        Console.WriteLine("  --auth=username,password,apikey  Set credentials via command line (required for service mode)");
        Console.WriteLine("  --help, -h                       Show this help message");
        Console.WriteLine("  --version, -v                    Show version information");
        Console.WriteLine("  --service                        Run as a Windows Service (Windows) or systemd (Linux)");
        Console.WriteLine("  --development                    Run in development mode (disable some security checks)");
        Console.WriteLine("  --command=restart                Internal use for self-update");
        Console.WriteLine("\nService installation (Windows):");
        Console.WriteLine("  sc create RazorEngine binPath= \"C:\\Path\\Engine.exe --service --auth=user,pass,key\"");
        Console.WriteLine("\nService installation (Linux):");
        Console.WriteLine("  Create /etc/systemd/system/Razor.service with:");
        Console.WriteLine("  [Service]");
        Console.WriteLine("  ExecStart=/opt/Razor/Engine --service --auth=user,pass,key");
        Console.WriteLine("  WorkingDirectory=/opt/Razor");
    }

    [SuppressMessage("Globalization", "CA1303:Do not pass literals as localized parameters",
        Justification = "Console output for version; no localization required.")]
    public static void PrintVersion()
    {
        Console.WriteLine($"Razor Engine v{AppConstants.EngineVersion} LTS");
        Console.WriteLine($"Target SDK: v{AppConstants.SdkVersion}");
        Console.WriteLine($"Runtime: {Environment.Version}");
    }
}
