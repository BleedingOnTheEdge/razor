---
id: product:razor/contracts/extension-developer-guide/project-setup
parent: product:razor/contracts/extension-developer-guide
title: Project Setup
level: product
kind: contract
domains: [sdk, extensions]
flows: [extension-development]
keywords:
  - project setup
  - csproj
  - net10.0
  - sdk package reference
  - sdkversion attribute
  - assemblyinfo
references:
  - product:razor/contracts/extension-developer-guide/compatibility
---

# Project Setup

## Create a Class Library

Create a .NET class library targeting `net10.0`. Example `.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">

    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>
        <AllowUnsafeBlocks>true</AllowUnsafeBlocks> <!-- Only if using unsafe code for high-perf I/O -->
        <GenerateDocumentationFile>true</GenerateDocumentationFile>
    </PropertyGroup>

    <ItemGroup>
        <PackageReference Include="Sdk" Version="1.0.0" />
    </ItemGroup>

</Project>
```

**Note:** The `AllowUnsafeBlocks` flag is only needed if you use unsafe code; adapters that implement memory-mapped tick files may require it.

## Assembly Attributes

Every extension assembly must declare the **target SDK version** using `SdkVersionAttribute`. Example `AssemblyInfo.cs` or in your `csproj`:

```csharp
using Sdk.Shared;

[assembly: SdkVersion("1.0.0")]
```

The engine validates this version at load time. A major version mismatch will prevent loading unless an explicit compatibility mode is configured (see `product:razor/contracts/extension-developer-guide/compatibility`).
