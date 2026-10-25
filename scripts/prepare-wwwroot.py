#!/usr/bin/env python3
"""
Prepares the razor wwwroot directory from pre-built Next.js assets.
Allows ASP.NET Core (.NET 10) to serve the entire Razor web console directly.
"""

import os
import shutil
import glob

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWWROOT = os.path.join(REPO_ROOT, "wwwroot")
DASHBOARD_DIST = os.path.join(REPO_ROOT, "dist", "dashboard", "frontends", "apps", "cloud-dashboard")
PUBLIC_DIR = os.path.join(REPO_ROOT, "frontends", "apps", "cloud-dashboard", "public")

print(f"📦 Staging wwwroot in {WWWROOT}...")

# 1. Clean and recreate wwwroot
if os.path.exists(WWWROOT):
    shutil.rmtree(WWWROOT)
os.makedirs(WWWROOT, exist_ok=True)

# 2. Copy static chunks (_next/static)
static_src = os.path.join(DASHBOARD_DIST, ".next", "static")
static_dst = os.path.join(WWWROOT, "_next", "static")
if os.path.exists(static_src):
    shutil.copytree(static_src, static_dst, dirs_exist_ok=True)
    print(f"  ✓ Copied static assets: {static_dst}")
else:
    print(f"  ⚠️ Warning: {static_src} not found!")

# 3. Copy public assets
if os.path.exists(PUBLIC_DIR):
    for item in os.listdir(PUBLIC_DIR):
        s = os.path.join(PUBLIC_DIR, item)
        d = os.path.join(WWWROOT, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
    print(f"  ✓ Copied public assets from {PUBLIC_DIR}")

# 4. Copy pre-rendered HTML files
server_app = os.path.join(DASHBOARD_DIST, ".next", "server", "app")
copied_pages = 0
if os.path.exists(server_app):
    for root, _, files in os.walk(server_app):
        for f in files:
            if f.endswith(".html"):
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, server_app)
                dst_path = os.path.join(WWWROOT, rel_path)
                os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                shutil.copy2(full_path, dst_path)
                copied_pages += 1

                # Also create folder/index.html for clean URL route support
                base_name = rel_path[:-5] # strip .html
                if base_name != "index" and not base_name.endswith("/index"):
                    dir_index = os.path.join(WWWROOT, base_name, "index.html")
                    os.makedirs(os.path.dirname(dir_index), exist_ok=True)
                    shutil.copy2(full_path, dir_index)

print(f"  ✓ Staged {copied_pages} pre-rendered HTML routes and clean URL directories.")

# 5. Ensure root index.html exists
root_index = os.path.join(WWWROOT, "index.html")
if not os.path.exists(root_index):
    # Try panel.html or index.html from server_app
    panel_html = os.path.join(WWWROOT, "panel.html")
    if os.path.exists(panel_html):
        shutil.copy2(panel_html, root_index)
        print("  ✓ Created root index.html from panel.html")

print(f"✅ wwwroot staging complete. Total files: {len(glob.glob(f'{WWWROOT}/**', recursive=True))}")
