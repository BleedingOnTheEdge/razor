#!/usr/bin/env python3
"""
Prepares the razor wwwroot directory from pre-built Next.js assets.
Allows ASP.NET Core (.NET 10) to serve the entire Razor web console and Marketplace directly.
"""

import os
import shutil
import glob

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWWROOT = os.path.join(REPO_ROOT, "wwwroot")

DASHBOARD_DIRS = [
    os.path.join(REPO_ROOT, "frontends", "apps", "cloud-dashboard"),
    os.path.join(REPO_ROOT, "dist", "dashboard", "frontends", "apps", "cloud-dashboard"),
    os.path.join(REPO_ROOT, "dist", "dashboard"),
]

MARKETPLACE_DIRS = [
    os.path.join(REPO_ROOT, "frontends", "apps", "marketplace"),
    os.path.join(REPO_ROOT, "dist", "marketplace", "frontends", "apps", "marketplace"),
    os.path.join(REPO_ROOT, "dist", "marketplace"),
]


def find_app_dir(candidates):
    for c in candidates:
        if os.path.exists(os.path.join(c, ".next")):
            return c
    return candidates[0]


dashboard_app = find_app_dir(DASHBOARD_DIRS)
marketplace_app = find_app_dir(MARKETPLACE_DIRS)

print(f"📦 Staging wwwroot in {WWWROOT}...")
print(f"  Using dashboard app source: {dashboard_app}")
print(f"  Using marketplace app source: {marketplace_app}")

# 1. Clean and recreate wwwroot
if os.path.exists(WWWROOT):
    shutil.rmtree(WWWROOT)
os.makedirs(WWWROOT, exist_ok=True)

# 2. Stage Cloud Dashboard
dashboard_static = os.path.join(dashboard_app, ".next", "static")
if os.path.exists(dashboard_static):
    shutil.copytree(dashboard_static, os.path.join(WWWROOT, "_next", "static"), dirs_exist_ok=True)
    print("  ✓ Staged dashboard _next/static")
else:
    print(f"  ⚠️ Warning: {dashboard_static} not found!")

dashboard_public = os.path.join(dashboard_app, "public")
if os.path.exists(dashboard_public):
    for item in os.listdir(dashboard_public):
        s = os.path.join(dashboard_public, item)
        d = os.path.join(WWWROOT, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
    print("  ✓ Staged dashboard public assets")

dashboard_server_app = os.path.join(dashboard_app, ".next", "server", "app")
copied_dashboard = 0
if os.path.exists(dashboard_server_app):
    for root, _, files in os.walk(dashboard_server_app):
        for f in files:
            if f.endswith(".html"):
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, dashboard_server_app)
                dst_path = os.path.join(WWWROOT, rel_path)
                os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                shutil.copy2(full_path, dst_path)
                copied_dashboard += 1

                # Clean URL index.html fallback
                base_name = rel_path[:-5]
                if base_name != "index" and not base_name.endswith("/index"):
                    dir_index = os.path.join(WWWROOT, base_name, "index.html")
                    os.makedirs(os.path.dirname(dir_index), exist_ok=True)
                    shutil.copy2(full_path, dir_index)

print(f"  ✓ Staged {copied_dashboard} dashboard pre-rendered HTML routes.")

# 3. Stage Marketplace under /marketplace
marketplace_static = os.path.join(marketplace_app, ".next", "static")
marketplace_target_dir = os.path.join(WWWROOT, "marketplace")
os.makedirs(marketplace_target_dir, exist_ok=True)

if os.path.exists(marketplace_static):
    # If basePath is '/marketplace', static assets are placed under _next/static
    shutil.copytree(marketplace_static, os.path.join(marketplace_target_dir, "_next", "static"), dirs_exist_ok=True)
    print("  ✓ Staged marketplace _next/static under /marketplace/_next/static")

marketplace_public = os.path.join(marketplace_app, "public")
if os.path.exists(marketplace_public):
    for item in os.listdir(marketplace_public):
        s = os.path.join(marketplace_public, item)
        d = os.path.join(marketplace_target_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
    print("  ✓ Staged marketplace public assets under /marketplace")

marketplace_server_app = os.path.join(marketplace_app, ".next", "server", "app")
copied_marketplace = 0
if os.path.exists(marketplace_server_app):
    for root, _, files in os.walk(marketplace_server_app):
        for f in files:
            if f.endswith(".html"):
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, marketplace_server_app)
                # Next.js app with basePath can have relative paths
                dst_path = os.path.join(marketplace_target_dir, rel_path)
                os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                shutil.copy2(full_path, dst_path)
                copied_marketplace += 1

                base_name = rel_path[:-5]
                if base_name != "index" and not base_name.endswith("/index"):
                    dir_index = os.path.join(marketplace_target_dir, base_name, "index.html")
                    os.makedirs(os.path.dirname(dir_index), exist_ok=True)
                    shutil.copy2(full_path, dir_index)

print(f"  ✓ Staged {copied_marketplace} marketplace pre-rendered HTML routes.")

# 4. Ensure root index.html exists
root_index = os.path.join(WWWROOT, "index.html")
if not os.path.exists(root_index):
    for candidate in ["index.html", "panel.html"]:
        p = os.path.join(WWWROOT, candidate)
        if os.path.exists(p):
            shutil.copy2(p, root_index)
            print(f"  ✓ Created root index.html from {candidate}")
            break

total_files = len(glob.glob(f"{WWWROOT}/**", recursive=True))
print(f"✅ wwwroot staging complete. Total files: {total_files}")
