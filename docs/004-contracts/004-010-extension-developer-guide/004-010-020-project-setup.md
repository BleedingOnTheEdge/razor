---
id: product:razor/contracts/extension-developer-guide/project-setup
parent: product:razor/contracts/extension-developer-guide
title: 3. Project Setup
level: product
kind: contract
---

# 3. Project Setup

## 3.1 Create a Class Library

Create a .NET class library targeting `net10.0`. Example `.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">

    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>
        <AllowUnsafeBlocks>true</AllowUnsafeBlocks> <!-- Only if using unsafe code for high‑perf I/O -->
        <GenerateDocumentationFile>true</GenerateDocumentationFile>
    </PropertyGroup>

    <ItemGroup>
        <PackageReference Include="Razor.Core.Sdk" Version="1.0.0" />
    </ItemGroup>

</Project>
```

**Note:** The `AllowUnsafeBlocks` flag is only needed if you use unsafe code; adapters that implement memory‑mapped tick files may require it.

## 3.2 Assembly Attributes

Every extension assembly must declare the **target SDK version** using `SdkVersionAttribute`. Example `AssemblyInfo.cs` or in your `csproj`:

```csharp
using Razor.Core.Sdk.Shared;

[assembly: SdkVersion("1.0.0")]
```

The engine validates this version at load time. A major version mismatch will prevent loading (see §10).

---
