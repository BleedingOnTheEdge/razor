using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cloud.Migrations
{
    /// <inheritdoc />
    internal partial class AddEnterpriseFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            ArgumentNullException.ThrowIfNull(migrationBuilder);

            migrationBuilder.AddColumn<string>(
                name: "SubscriptionTier",
                table: "Accounts",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Free");

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Users",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Developer");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Users",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "Users",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AvatarUrl",
                table: "Users",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Bio",
                table: "Users",
                type: "character varying(1024)",
                maxLength: 1024,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SystemSettings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Description = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    Value = table.Column<string>(type: "character varying(8192)", maxLength: 8192, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemSettings", x => x.Key);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            ArgumentNullException.ThrowIfNull(migrationBuilder);

            migrationBuilder.DropTable(name: "SystemSettings");
            migrationBuilder.DropColumn(name: "SubscriptionTier", table: "Accounts");
            migrationBuilder.DropColumn(name: "Role", table: "Users");
            migrationBuilder.DropColumn(name: "Email", table: "Users");
            migrationBuilder.DropColumn(name: "DisplayName", table: "Users");
            migrationBuilder.DropColumn(name: "AvatarUrl", table: "Users");
            migrationBuilder.DropColumn(name: "Bio", table: "Users");
        }
    }
}
