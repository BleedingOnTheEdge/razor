// -----------------------------------------------------------------------------
// <copyright file="CloudDbContext.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

using Microsoft.EntityFrameworkCore;

/// <summary>
/// The PostgreSQL persistence model for the Cloud control plane
/// (002-030-160 §17.1: accounts, licences, engine instances, profiles, commands and their results).
/// </summary>
/// <remarks>
/// <para>
/// Enum columns are persisted as strings rather than integers. The store is the durable record of a
/// control plane that is read by operators and by ad-hoc SQL, so a readable value and a stable mapping
/// that survives reordering of the enum members matter more here than the bytes saved by an integer.
/// </para>
/// <para>
/// Every string column is bounded explicitly. PostgreSQL maps an unbounded <see cref="string"/> to
/// <c>text</c>, which cannot be indexed by the unique constraints below without a prefix length.
/// </para>
/// </remarks>
internal sealed class CloudDbContext : DbContext
{
    /// <summary>Initialises a new instance of the <see cref="CloudDbContext"/> class.</summary>
    /// <param name="options">The context options, supplied by the factory or the test harness.</param>
    internal CloudDbContext(DbContextOptions<CloudDbContext> options)
        : base(options)
    {
    }

    /// <summary>Gets the customer accounts.</summary>
    public DbSet<Account> Accounts => Set<Account>();

    /// <summary>Gets the users.</summary>
    public DbSet<User> Users => Set<User>();

    /// <summary>Gets the licences.</summary>
    public DbSet<License> Licenses => Set<License>();

    /// <summary>Gets the registered Engine instances.</summary>
    public DbSet<EngineInstance> EngineInstances => Set<EngineInstance>();

    /// <summary>Gets the per-instance profiles.</summary>
    public DbSet<EngineProfile> EngineProfiles => Set<EngineProfile>();

    /// <summary>Gets the profile selections.</summary>
    public DbSet<ProfileSelection> ProfileSelections => Set<ProfileSelection>();

    /// <summary>Gets the reported extension manifest entries.</summary>
    public DbSet<ExtensionManifestEntry> ExtensionManifestEntries => Set<ExtensionManifestEntry>();

    /// <summary>Gets the submitted commands.</summary>
    public DbSet<EngineCommand> EngineCommands => Set<EngineCommand>();

    /// <summary>Gets the received progress reports.</summary>
    public DbSet<CommandProgressReport> CommandProgressReports => Set<CommandProgressReport>();

    /// <inheritdoc/>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        ConfigureAccount(modelBuilder);
        ConfigureUser(modelBuilder);
        ConfigureLicense(modelBuilder);
        ConfigureEngineInstance(modelBuilder);
        ConfigureEngineProfile(modelBuilder);
        ConfigureExtensionManifestEntry(modelBuilder);
        ConfigureEngineCommand(modelBuilder);
    }

    private static void ConfigureAccount(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Account>(account =>
        {
            account.HasKey(a => a.Id);
            account.Property(a => a.Name).IsRequired().HasMaxLength(128);
            account.HasMany(a => a.Users).WithOne(u => u!.Account!).HasForeignKey(u => u.AccountId).OnDelete(DeleteBehavior.Cascade);
            account.HasMany(a => a.Licenses).WithOne(l => l!.Account!).HasForeignKey(l => l.AccountId).OnDelete(DeleteBehavior.Cascade);
            account.HasMany(a => a.Instances).WithOne(i => i!.Account!).HasForeignKey(i => i.AccountId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureUser(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(user =>
        {
            user.HasKey(u => u.Id);
            user.Property(u => u.UserName).IsRequired().HasMaxLength(128);
            user.Property(u => u.PasswordHash).IsRequired().HasMaxLength(512);
            user.HasIndex(u => u.UserName).IsUnique();
        });
    }

    private static void ConfigureLicense(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<License>(license =>
        {
            license.HasKey(l => l.Id);
            license.Property(l => l.LicenseKey).IsRequired().HasMaxLength(128);
            license.Property(l => l.Status).HasConversion<string>().HasMaxLength(32);
            license.HasIndex(l => l.LicenseKey).IsUnique();
            license.HasMany(l => l.Instances).WithOne(i => i!.License!).HasForeignKey(i => i.LicenseId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureEngineInstance(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EngineInstance>(instance =>
        {
            instance.HasKey(i => i.Id);
            instance.Property(i => i.EngineId).IsRequired().HasMaxLength(128);
            instance.Property(i => i.Name).IsRequired().HasMaxLength(128);
            instance.Property(i => i.ApiKeyHash).IsRequired().HasMaxLength(128);
            instance.Property(i => i.Status).HasConversion<string>().HasMaxLength(32);
            instance.HasIndex(i => i.EngineId).IsUnique();
            instance.HasIndex(i => i.ApiKeyHash).IsUnique();
            instance.HasOne(i => i.Profile).WithOne(p => p!.EngineInstance!).HasForeignKey<EngineProfile>(p => p.EngineInstanceId).OnDelete(DeleteBehavior.Cascade);
            instance.HasMany(i => i.ManifestEntries).WithOne(m => m!.EngineInstance!).HasForeignKey(m => m.EngineInstanceId).OnDelete(DeleteBehavior.Cascade);
            instance.HasMany(i => i.Commands).WithOne(c => c!.EngineInstance!).HasForeignKey(c => c.EngineInstanceId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureEngineProfile(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EngineProfile>(profile =>
        {
            profile.HasKey(p => p.Id);
            profile.HasMany(p => p.Selections).WithOne(s => s!.EngineProfile!).HasForeignKey(s => s.EngineProfileId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfileSelection>(selection =>
        {
            selection.HasKey(s => s.Id);
            selection.Property(s => s.Kind).HasConversion<string>().HasMaxLength(32);
            selection.Property(s => s.Name).IsRequired().HasMaxLength(256);
            selection.HasIndex(s => new { s.EngineProfileId, s.Kind, s.Name }).IsUnique();
        });
    }

    private static void ConfigureExtensionManifestEntry(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ExtensionManifestEntry>(entry =>
        {
            entry.HasKey(e => e.Id);
            entry.Property(e => e.Kind).HasConversion<string>().HasMaxLength(32);
            entry.Property(e => e.Name).IsRequired().HasMaxLength(256);
            entry.HasIndex(e => new { e.EngineInstanceId, e.Kind, e.Name }).IsUnique();
        });
    }

    private static void ConfigureEngineCommand(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EngineCommand>(command =>
        {
            command.HasKey(c => c.Id);
            command.Property(c => c.CommandType).IsRequired().HasMaxLength(128);
            command.Property(c => c.ParametersJson).HasMaxLength(8192);
            command.Property(c => c.CorrelationId).IsRequired().HasMaxLength(128);
            command.Property(c => c.Status).HasConversion<string>().HasMaxLength(32);
            command.Property(c => c.ResultPayloadJson).HasMaxLength(8192);
            command.Property(c => c.ErrorMessage).HasMaxLength(2048);
            command.HasIndex(c => c.CorrelationId).IsUnique();
            command.HasIndex(c => new { c.EngineInstanceId, c.Status });
            command.HasMany(c => c.ProgressReports).WithOne(p => p!.EngineCommand!).HasForeignKey(p => p.EngineCommandId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CommandProgressReport>(report =>
        {
            report.HasKey(r => r.Id);
            report.Property(r => r.PayloadJson).IsRequired().HasMaxLength(8192);
            report.HasIndex(r => r.EngineCommandId);
        });
    }
}
