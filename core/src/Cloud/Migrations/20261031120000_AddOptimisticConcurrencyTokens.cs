using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cloud.Migrations
{
    /// <inheritdoc />
    internal partial class AddOptimisticConcurrencyTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            ArgumentNullException.ThrowIfNull(migrationBuilder);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Accounts",
                type: "bytea",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Licenses",
                type: "bytea",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "EngineInstances",
                type: "bytea",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "FlowRuns",
                type: "bytea",
                rowVersion: true,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            ArgumentNullException.ThrowIfNull(migrationBuilder);

            migrationBuilder.DropColumn(name: "RowVersion", table: "Accounts");
            migrationBuilder.DropColumn(name: "RowVersion", table: "Licenses");
            migrationBuilder.DropColumn(name: "RowVersion", table: "EngineInstances");
            migrationBuilder.DropColumn(name: "RowVersion", table: "FlowRuns");
        }
    }
}
