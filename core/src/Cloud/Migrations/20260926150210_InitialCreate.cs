using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cloud.Migrations
{
    /// <inheritdoc />
    internal partial class InitialCreate : Migration
    {
        private static readonly string[] EngineCommandInstanceStatusColumns = ["EngineInstanceId", "Status"];

        private static readonly string[] ManifestEntryColumns = ["EngineInstanceId", "Kind", "Name"];

        private static readonly string[] ProfileSelectionColumns = ["EngineProfileId", "Kind", "Name"];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            ArgumentNullException.ThrowIfNull(migrationBuilder);

            migrationBuilder.CreateTable(
                name: "Accounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Accounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Licenses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    LicenseKey = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    IssuedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    MaxInstances = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Licenses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Licenses_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EngineInstances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    LicenseId = table.Column<Guid>(type: "uuid", nullable: false),
                    EngineId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ApiKeyHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EngineInstances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EngineInstances_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EngineInstances_Licenses_LicenseId",
                        column: x => x.LicenseId,
                        principalTable: "Licenses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EngineCommands",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EngineInstanceId = table.Column<Guid>(type: "uuid", nullable: false),
                    NumericCommandId = table.Column<int>(type: "integer", nullable: false),
                    CommandType = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ParametersJson = table.Column<string>(type: "character varying(8192)", maxLength: 8192, nullable: true),
                    TimeoutSeconds = table.Column<int>(type: "integer", nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DispatchedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ResultPayloadJson = table.Column<string>(type: "character varying(8192)", maxLength: 8192, nullable: true),
                    ErrorMessage = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EngineCommands", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EngineCommands_EngineInstances_EngineInstanceId",
                        column: x => x.EngineInstanceId,
                        principalTable: "EngineInstances",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EngineProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EngineInstanceId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EngineProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EngineProfiles_EngineInstances_EngineInstanceId",
                        column: x => x.EngineInstanceId,
                        principalTable: "EngineInstances",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExtensionManifestEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EngineInstanceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    ReportedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExtensionManifestEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExtensionManifestEntries_EngineInstances_EngineInstanceId",
                        column: x => x.EngineInstanceId,
                        principalTable: "EngineInstances",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CommandProgressReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EngineCommandId = table.Column<Guid>(type: "uuid", nullable: false),
                    PayloadJson = table.Column<string>(type: "character varying(8192)", maxLength: 8192, nullable: false),
                    ReportedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommandProgressReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommandProgressReports_EngineCommands_EngineCommandId",
                        column: x => x.EngineCommandId,
                        principalTable: "EngineCommands",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProfileSelections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EngineProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileSelections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfileSelections_EngineProfiles_EngineProfileId",
                        column: x => x.EngineProfileId,
                        principalTable: "EngineProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommandProgressReports_EngineCommandId",
                table: "CommandProgressReports",
                column: "EngineCommandId");

            migrationBuilder.CreateIndex(
                name: "IX_EngineCommands_CorrelationId",
                table: "EngineCommands",
                column: "CorrelationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EngineCommands_EngineInstanceId_Status",
                table: "EngineCommands",
                columns: EngineCommandInstanceStatusColumns);

            migrationBuilder.CreateIndex(
                name: "IX_EngineInstances_AccountId",
                table: "EngineInstances",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_EngineInstances_ApiKeyHash",
                table: "EngineInstances",
                column: "ApiKeyHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EngineInstances_EngineId",
                table: "EngineInstances",
                column: "EngineId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EngineInstances_LicenseId",
                table: "EngineInstances",
                column: "LicenseId");

            migrationBuilder.CreateIndex(
                name: "IX_EngineProfiles_EngineInstanceId",
                table: "EngineProfiles",
                column: "EngineInstanceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExtensionManifestEntries_EngineInstanceId_Kind_Name",
                table: "ExtensionManifestEntries",
                columns: ManifestEntryColumns);

            migrationBuilder.CreateIndex(
                name: "IX_Licenses_AccountId",
                table: "Licenses",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Licenses_LicenseKey",
                table: "Licenses",
                column: "LicenseKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProfileSelections_EngineProfileId_Kind_Name",
                table: "ProfileSelections",
                columns: ProfileSelectionColumns);

            migrationBuilder.CreateIndex(
                name: "IX_Users_AccountId",
                table: "Users",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_UserName",
                table: "Users",
                column: "UserName",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            ArgumentNullException.ThrowIfNull(migrationBuilder);

            migrationBuilder.DropTable(
                name: "CommandProgressReports");

            migrationBuilder.DropTable(
                name: "ExtensionManifestEntries");

            migrationBuilder.DropTable(
                name: "ProfileSelections");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "EngineCommands");

            migrationBuilder.DropTable(
                name: "EngineProfiles");

            migrationBuilder.DropTable(
                name: "EngineInstances");

            migrationBuilder.DropTable(
                name: "Licenses");

            migrationBuilder.DropTable(
                name: "Accounts");
        }
    }
}
