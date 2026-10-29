// -----------------------------------------------------------------------------
// <copyright file="DatabaseSchemaCompatibility.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

using Microsoft.EntityFrameworkCore;

/// <summary>
/// Provides idempotent schema alignment for persistent PostgreSQL databases, ensuring
/// that newly added columns and tables are created seamlessly without manual database drops.
/// </summary>
internal static class DatabaseSchemaCompatibility
{
    /// <summary>
    /// Determines whether the specified provider name represents PostgreSQL.
    /// </summary>
    internal static bool IsPostgreSqlProvider(string? providerName)
    {
        return providerName is not null && (
            providerName.Contains("PostgreSQL", StringComparison.OrdinalIgnoreCase) ||
            providerName.Contains("Npgsql", StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Synchronizes missing columns and tables on PostgreSQL instances idempotently.
    /// </summary>
    internal static async Task EnsureSchemaAsync(CloudDbContext db, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(db);

        if (!IsPostgreSqlProvider(db.Database.ProviderName))
        {
            return;
        }

        const string sql = """
            -- Ensure Accounts table has subscription tier column
            ALTER TABLE IF EXISTS "Accounts" ADD COLUMN IF NOT EXISTS "SubscriptionTier" character varying(32) NOT NULL DEFAULT 'Free';

            -- Ensure Users table has all enterprise profile columns
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "Role" character varying(32) NOT NULL DEFAULT 'Trader';
            -- Normalize legacy Developer roles to Trader
            UPDATE "Users" SET "Role" = 'Trader' WHERE "Role" = 'Developer' OR "Role" = 'developer';
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "Email" character varying(256);
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "DisplayName" character varying(128);
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "AvatarUrl" character varying(512);
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "Bio" character varying(1024);
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "PhoneCountryCode" character varying(8);
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "PhoneNumber" character varying(32);
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "SecondaryEmail" character varying(256);
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "TwoFactorEnabled" boolean NOT NULL DEFAULT false;
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "TelegramHandle" character varying(128);
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "GoogleDriveLinked" boolean NOT NULL DEFAULT false;
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "OneDriveLinked" boolean NOT NULL DEFAULT false;
            ALTER TABLE IF EXISTS "Users" ADD COLUMN IF NOT EXISTS "SmsOtpEnabled" boolean NOT NULL DEFAULT false;

            -- Ensure SystemSettings table exists
            CREATE TABLE IF NOT EXISTS "SystemSettings" (
                "Key" character varying(128) PRIMARY KEY,
                "Category" character varying(64) NOT NULL,
                "Description" character varying(512),
                "Value" character varying(8192) NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL
            );

            -- Ensure FlowRuns and lineage tables exist
            CREATE TABLE IF NOT EXISTS "FlowRuns" (
                "Id" uuid PRIMARY KEY,
                "EngineInstanceId" uuid NOT NULL REFERENCES "EngineInstances"("Id") ON DELETE CASCADE,
                "Kind" character varying(32) NOT NULL,
                "Status" character varying(32) NOT NULL,
                "ParentRunId" uuid REFERENCES "FlowRuns"("Id") ON DELETE RESTRICT,
                "Relation" character varying(32),
                "Continuity" character varying(32),
                "ForkPointStep" integer,
                "ForkPointGeneration" integer,
                "ForkPointWindowIndex" integer,
                "BaseSeed" bigint,
                "RandomPosition" character varying(4096),
                "NetProfit" numeric,
                "TotalReturn" numeric,
                "SharpeRatio" double precision,
                "MaxDrawdown" double precision,
                "TradeCount" integer,
                "BestFitness" double precision,
                "IsPartial" boolean NOT NULL DEFAULT false,
                "CreatedAt" timestamp with time zone NOT NULL,
                "CompletedAt" timestamp with time zone,
                "ConfigurationJson" character varying(16384),
                "WinningDnaJson" text,
                "ResultPayloadJson" text
            );

            -- Ensure FlowRuns table has newly added columns if already created
            ALTER TABLE IF EXISTS "FlowRuns" ADD COLUMN IF NOT EXISTS "ConfigurationJson" character varying(16384);
            ALTER TABLE IF EXISTS "FlowRuns" ADD COLUMN IF NOT EXISTS "WinningDnaJson" text;
            ALTER TABLE IF EXISTS "FlowRuns" ADD COLUMN IF NOT EXISTS "ResultPayloadJson" text;

            CREATE TABLE IF NOT EXISTS "RunInterventions" (
                "Id" uuid PRIMARY KEY,
                "FlowRunId" uuid NOT NULL REFERENCES "FlowRuns"("Id") ON DELETE CASCADE,
                "StepIndex" integer NOT NULL,
                "PreviousFingerprint" character varying(64) NOT NULL,
                "NewFingerprint" character varying(64) NOT NULL,
                "Actor" character varying(128) NOT NULL,
                "Timestamp" timestamp with time zone NOT NULL,
                "Reason" character varying(1024) NOT NULL,
                "ModificationsSummary" character varying(2048),
                "BeforePayloadJson" character varying(8192),
                "AfterPayloadJson" character varying(8192)
            );

            CREATE TABLE IF NOT EXISTS "RunGaps" (
                "Id" uuid PRIMARY KEY,
                "FlowRunId" uuid NOT NULL REFERENCES "FlowRuns"("Id") ON DELETE CASCADE,
                "StartStep" integer NOT NULL,
                "EndStep" integer NOT NULL,
                "Reason" character varying(1024) NOT NULL
            );

            -- Ensure Marketplace tables exist
            CREATE TABLE IF NOT EXISTS "MarketplaceItems" (
                "Id" uuid PRIMARY KEY,
                "Kind" character varying(32) NOT NULL,
                "Name" character varying(128) NOT NULL,
                "Version" character varying(32) NOT NULL,
                "Author" character varying(128) NOT NULL,
                "Description" character varying(2048),
                "SdkVersion" character varying(32) NOT NULL,
                "IsCurated" boolean NOT NULL DEFAULT false,
                "Rating" double precision NOT NULL DEFAULT 5.0,
                "Downloads" integer NOT NULL DEFAULT 0,
                "PriceUsd" numeric NOT NULL DEFAULT 0,
                "PublishedAt" timestamp with time zone NOT NULL
            );

            CREATE TABLE IF NOT EXISTS "MarketplaceAcquisitions" (
                "Id" uuid PRIMARY KEY,
                "MarketplaceItemId" uuid NOT NULL REFERENCES "MarketplaceItems"("Id") ON DELETE CASCADE,
                "AccountId" uuid NOT NULL REFERENCES "Accounts"("Id") ON DELETE CASCADE,
                "EngineInstanceId" uuid REFERENCES "EngineInstances"("Id") ON DELETE SET NULL,
                "LicenseKey" character varying(128) NOT NULL,
                "AcquiredVersion" character varying(32) NOT NULL DEFAULT '1.0.0',
                "LicenseType" character varying(32) NOT NULL DEFAULT 'Perpetual',
                "RightsJson" character varying(2048) NOT NULL DEFAULT '{{}}',
                "AcquiredAt" timestamp with time zone NOT NULL,
                "ExpiresAt" timestamp with time zone
            );

            ALTER TABLE IF EXISTS "MarketplaceAcquisitions" ADD COLUMN IF NOT EXISTS "AcquiredVersion" character varying(32) NOT NULL DEFAULT '1.0.0';
            ALTER TABLE IF EXISTS "MarketplaceAcquisitions" ADD COLUMN IF NOT EXISTS "LicenseType" character varying(32) NOT NULL DEFAULT 'Perpetual';
            ALTER TABLE IF EXISTS "MarketplaceAcquisitions" ADD COLUMN IF NOT EXISTS "RightsJson" character varying(2048) NOT NULL DEFAULT '{{}}';

            -- Ensure Support Ticket tables exist
            CREATE TABLE IF NOT EXISTS "Tickets" (
                "Id" uuid PRIMARY KEY,
                "AccountId" uuid NOT NULL REFERENCES "Accounts"("Id") ON DELETE CASCADE,
                "TargetType" character varying(32) NOT NULL,
                "TargetItemId" uuid,
                "TargetItemName" character varying(128),
                "Title" character varying(256) NOT NULL,
                "Description" character varying(4096) NOT NULL,
                "Category" character varying(32) NOT NULL,
                "Priority" character varying(32) NOT NULL,
                "Status" character varying(32) NOT NULL,
                "AuthorName" character varying(128) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL
            );

            CREATE TABLE IF NOT EXISTS "TicketMessages" (
                "Id" uuid PRIMARY KEY,
                "TicketId" uuid NOT NULL REFERENCES "Tickets"("Id") ON DELETE CASCADE,
                "AuthorName" character varying(128) NOT NULL,
                "AuthorRole" character varying(64) NOT NULL,
                "Message" character varying(4096) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL
            );

            -- Ensure Community Thread tables exist
            CREATE TABLE IF NOT EXISTS "CommunityThreads" (
                "Id" uuid PRIMARY KEY,
                "Category" character varying(64) NOT NULL,
                "Title" character varying(256) NOT NULL,
                "AuthorName" character varying(128) NOT NULL,
                "AuthorBadge" character varying(64) NOT NULL,
                "Content" character varying(8192) NOT NULL,
                "Upvotes" integer NOT NULL DEFAULT 0,
                "RepliesCount" integer NOT NULL DEFAULT 0,
                "CreatedAt" timestamp with time zone NOT NULL
            );

            CREATE TABLE IF NOT EXISTS "CommunityReplies" (
                "Id" uuid PRIMARY KEY,
                "ThreadId" uuid NOT NULL REFERENCES "CommunityThreads"("Id") ON DELETE CASCADE,
                "AuthorName" character varying(128) NOT NULL,
                "AuthorBadge" character varying(64) NOT NULL,
                "Content" character varying(4096) NOT NULL,
                "Upvotes" integer NOT NULL DEFAULT 0,
                "CreatedAt" timestamp with time zone NOT NULL
            );

            -- Ensure EngineShares table exists
            CREATE TABLE IF NOT EXISTS "EngineShares" (
                "Id" uuid PRIMARY KEY,
                "EngineInstanceId" uuid NOT NULL REFERENCES "EngineInstances"("Id") ON DELETE CASCADE,
                "OwnerAccountId" uuid NOT NULL,
                "SharedWithUserId" uuid,
                "SharedWithEmail" character varying(256) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "ExpiresAtUtc" timestamp with time zone NOT NULL,
                "CanRead" boolean NOT NULL DEFAULT true,
                "CanControl" boolean NOT NULL DEFAULT true,
                "CanRunFlows" boolean NOT NULL DEFAULT true,
                "IsRevoked" boolean NOT NULL DEFAULT false
            );

            -- Ensure Bundles and Snapshots tables exist
            CREATE TABLE IF NOT EXISTS "TradingBundles" (
                "Id" character varying(32) PRIMARY KEY,
                "AccountId" uuid NOT NULL REFERENCES "Accounts"("Id") ON DELETE CASCADE,
                "Name" character varying(128) NOT NULL,
                "Description" character varying(2048),
                "DocumentationMarkdown" text,
                "IsPublic" boolean NOT NULL DEFAULT false,
                "PublishedToMarketplace" boolean NOT NULL DEFAULT false,
                "Price" numeric NOT NULL DEFAULT 0,
                "Currency" character varying(16) NOT NULL DEFAULT 'Free',
                "StrategySlotId" character varying(64),
                "AdapterSlotIdsJson" character varying(4096) NOT NULL DEFAULT '[]',
                "HookSlotIdsJson" character varying(4096) NOT NULL DEFAULT '[]',
                "DefaultConfigurationsJson" character varying(16384) NOT NULL DEFAULT '{{}}',
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NOT NULL
            );

            CREATE TABLE IF NOT EXISTS "BundleSnapshots" (
                "Id" uuid PRIMARY KEY,
                "BundleId" character varying(32) NOT NULL REFERENCES "TradingBundles"("Id") ON DELETE CASCADE,
                "Version" character varying(32) NOT NULL,
                "Name" character varying(128),
                "SnapshotStateJson" character varying(32768) NOT NULL DEFAULT '{{}}',
                "CreatedAt" timestamp with time zone NOT NULL
            );

            CREATE TABLE IF NOT EXISTS "BundleDnas" (
                "Id" uuid PRIMARY KEY,
                "BundleSnapshotId" uuid NOT NULL REFERENCES "BundleSnapshots"("Id") ON DELETE CASCADE,
                "DnaId" character varying(64) NOT NULL,
                "Name" character varying(128),
                "ParametersJson" character varying(16384) NOT NULL DEFAULT '{{}}',
                "BacktestStatus" character varying(32) NOT NULL DEFAULT 'Untested',
                "Fitness" double precision,
                "NetProfit" numeric,
                "ReportSummary" character varying(4096),
                "CreatedAt" timestamp with time zone NOT NULL
            );
            """;

        await db.Database.ExecuteSqlRawAsync(sql, cancellationToken).ConfigureAwait(false);
    }
}
