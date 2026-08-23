import os
import sys
import glob
import urllib.parse
import subprocess
import threading
import winreg

class AppLauncher:
    """Secure, robust OS Automation Tool for scanning & launching Windows applications."""

    # Exhaustive dictionary of known applications, system tools, and protocol URIs
    KNOWN_APPS = {
        # Browsers
        "chrome": ["cmd.exe", "/c", "start", "", "chrome"],
        "google chrome": ["cmd.exe", "/c", "start", "", "chrome"],
        "edge": "msedge:",
        "microsoft edge": "msedge:",
        "firefox": ["cmd.exe", "/c", "start", "", "firefox"],
        "brave": ["cmd.exe", "/c", "start", "", "brave"],
        "opera": ["cmd.exe", "/c", "start", "", "opera"],
        
        # Standard Utilities
        "notepad": ["notepad.exe"],
        "calculator": "calc.exe",
        "calc": "calc.exe",
        "paint": ["mspaint.exe"],
        "ms paint": ["mspaint.exe"],
        "wordpad": ["write.exe"],
        "snipping tool": ["snippingtool.exe"],
        "terminal": "wt:",
        "windows terminal": "wt:",
        
        # Microsoft Office Suite
        "word": ["cmd.exe", "/c", "start", "", "winword"],
        "ms word": ["cmd.exe", "/c", "start", "", "winword"],
        "excel": ["cmd.exe", "/c", "start", "", "excel"],
        "ms excel": ["cmd.exe", "/c", "start", "", "excel"],
        "powerpoint": ["cmd.exe", "/c", "start", "", "powerpnt"],
        "ms powerpoint": ["cmd.exe", "/c", "start", "", "powerpnt"],
        "outlook": ["cmd.exe", "/c", "start", "", "outlook"],
        "onenote": "onenote:",
        
        # Creative & Dev Tools
        "spotify": "spotify:",
        "youtube": "https://www.youtube.com",
        "youtube music": "https://music.youtube.com",
        "yt music": "https://music.youtube.com",
        "vs code": ["cmd.exe", "/c", "code"],
        "vscode": ["cmd.exe", "/c", "code"],
        "visual studio code": ["cmd.exe", "/c", "code"],
        "visual studio": ["cmd.exe", "/c", "devenv"],
        "pycharm": ["cmd.exe", "/c", "pycharm"],
        "intellij": ["cmd.exe", "/c", "idea"],
        "webstorm": ["cmd.exe", "/c", "webstorm"],
        "sublime text": ["cmd.exe", "/c", "subl"],
        "cursor": ["cmd.exe", "/c", "cursor"],
        "git bash": ["cmd.exe", "/c", "git-bash"],
        "postman": ["cmd.exe", "/c", "postman"],
        "android studio": ["cmd.exe", "/c", "studio"],
        "figma": ["cmd.exe", "/c", "figma"],
        "blender": ["cmd.exe", "/c", "blender"],
        "obs": ["cmd.exe", "/c", "obs64"],
        "obs studio": ["cmd.exe", "/c", "obs64"],
        "vlc": ["cmd.exe", "/c", "vlc"],
        
        # Social & Gaming
        "discord": ["Update.exe", "--processStart", "Discord.exe"],
        "whatsapp": "whatsapp:",
        "telegram": "tg:",
        "zoom": "zoommtg:",
        "teams": "msteams:",
        "microsoft teams": "msteams:",
        "steam": "steam:",
        "epic games": "com.epicgames.launcher:",
        "roblox": "roblox:",
        "notion": "notion:",
        
        # Windows System Folders
        "explorer": ["explorer.exe"],
        "file explorer": ["explorer.exe"],
        "recycle bin": ["explorer.exe", "shell:RecycleBinFolder"],
        "this pc": ["explorer.exe", "shell:MyComputerFolder"],
        "documents": ["explorer.exe", "shell:Personal"],
        "downloads": ["explorer.exe", "shell:Downloads"],
        "pictures": ["explorer.exe", "shell:My Pictures"],
        
        # System Management
        "cmd": ["cmd.exe"],
        "command prompt": ["cmd.exe"],
        "powershell": ["powershell.exe"],
        "task manager": ["taskmgr.exe"],
        "control panel": ["control.exe"],
        "settings": "ms-settings:",
        "device manager": ["devmgmt.msc"],
        "registry editor": ["regedit.exe"],
        "system information": ["msinfo32.exe"],
        
        # Default UWP Apps
        "photos": "ms-photos:",
        "camera": "microsoft.windows.camera:",
        "clock": "ms-clock:",
        "alarms": "ms-clock:",
        "weather": "bingweather:",
        "maps": "bingmaps:",
        "store": "ms-windows-store:",
        "microsoft store": "ms-windows-store:"
    }

    # Top known website domains mapped directly to HTTPS URLs
    KNOWN_WEBSITES = {
        "netflix": "https://www.netflix.com",
        "unity": "https://unity.com",
        "unity3d": "https://unity.com",
        "youtube": "https://www.youtube.com",
        "youtube music": "https://music.youtube.com",
        "yt music": "https://music.youtube.com",
        "github": "https://github.com",
        "gitlab": "https://gitlab.com",
        "reddit": "https://www.reddit.com",
        "wikipedia": "https://www.wikipedia.org",
        "amazon": "https://www.amazon.com",
        "chatgpt": "https://chatgpt.com",
        "claude": "https://claude.ai",
        "twitter": "https://x.com",
        "x": "https://x.com",
        "instagram": "https://www.instagram.com",
        "linkedin": "https://www.linkedin.com",
        "facebook": "https://www.facebook.com",
        "twitch": "https://www.twitch.tv",
        "discord": "https://discord.com/app",
        "whatsapp": "https://web.whatsapp.com",
        "spotify": "https://open.spotify.com",
        "imdb": "https://www.imdb.com",
        "figma": "https://www.figma.com",
        "notion": "https://www.notion.so",
        "canva": "https://www.canva.com",
        "stackoverflow": "https://stackoverflow.com",
        "stack overflow": "https://stackoverflow.com"
    }

    @staticmethod
    def _normalize_name(name: str) -> str:
        """Helper to normalize app names for flexible fuzzy matching."""
        s = name.lower()
        for prefix in ["adobe ", "microsoft ", "autodesk ", "google ", "app ", "the "]:
            if s.startswith(prefix):
                s = s[len(prefix):]
        for suffix in [" website", " site", " official", " web"]:
            if s.endswith(suffix):
                s = s[:-len(suffix)]
        for char in ["-", "_", ".", "(", ")", "  "]:
            s = s.replace(char, " ")
        return s.strip().replace(" ", "")

    @staticmethod
    def _find_in_registry(app_name: str) -> str:
        """Scans Windows Registry App Paths for registered executables."""
        target_norm = AppLauncher._normalize_name(app_name)
        reg_keys = [
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths"),
            (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths")
        ]
        for hkey, key_path in reg_keys:
            try:
                with winreg.OpenKey(hkey, key_path) as root_key:
                    num_subkeys = winreg.QueryInfoKey(root_key)[0]
                    for i in range(num_subkeys):
                        try:
                            subkey_name = winreg.EnumKey(root_key, i)
                            clean_sub = AppLauncher._normalize_name(subkey_name.replace(".exe", ""))
                            if target_norm in clean_sub or clean_sub in target_norm:
                                with winreg.OpenKey(root_key, subkey_name) as app_key:
                                    val, _ = winreg.QueryValueEx(app_key, "")
                                    if val and os.path.exists(val):
                                        return val
                        except Exception:
                            continue
            except Exception:
                continue
        return None

    @staticmethod
    def _find_app_in_system(app_name: str) -> str:
        """Deep search across Windows Start Menu, Desktops, LocalAppData, and PATH for executables/shortcuts."""
        target_norm = AppLauncher._normalize_name(app_name)
        
        # Candidate search directories for .lnk and .exe files
        search_globs = [
            os.path.expandvars(r'%ProgramData%\Microsoft\Windows\Start Menu\Programs\**\*.lnk'),
            os.path.expandvars(r'%APPDATA%\Microsoft\Windows\Start Menu\Programs\**\*.lnk'),
            os.path.expandvars(r'%USERPROFILE%\Desktop\*.lnk'),
            os.path.expandvars(r'%PUBLIC%\Desktop\*.lnk'),
            os.path.expandvars(r'%LOCALAPPDATA%\Programs\**\*.exe'),
            os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\WindowsApps\*.exe')
        ]
        
        found_paths = []
        for g in search_globs:
            try:
                found_paths.extend(glob.glob(g, recursive=True))
            except Exception:
                continue

        # Check collected paths with fuzzy string matching
        for path in found_paths:
            base_name = os.path.basename(path)
            clean_base = AppLauncher._normalize_name(base_name.replace(".lnk", "").replace(".exe", ""))
            
            # Skip uninstaller shortcuts or generic helper executables
            if "uninstall" in clean_base or "update" in clean_base or "setup" in clean_base:
                continue
                
            if target_norm == clean_base or target_norm in clean_base or clean_base in target_norm:
                return path

        # Registry lookup fallback
        reg_match = AppLauncher._find_in_registry(app_name)
        if reg_match:
            return reg_match

        # PATH lookup fallback via where.exe
        try:
            res = subprocess.run(["where.exe", app_name], capture_output=True, text=True, timeout=2)
            if res.returncode == 0 and res.stdout:
                first_line = res.stdout.strip().splitlines()[0]
                if os.path.exists(first_line):
                    return first_line
        except Exception:
            pass

        return None

    @staticmethod
    def launch_app(target: str, query: str = "") -> bool:
        """Launches a whitelisted application securely in a background thread, or performs deep-linked web automation."""
        target_clean = target.lower().strip()
        query_encoded = urllib.parse.quote_plus(query.strip()) if query else ""
        
        # Check if user specifically requested a website or URL
        is_website_req = any(kw in target_clean for kw in ["website", "site", "web", "www", "http", ".com", ".org", ".io", ".net", ".ai", ".dev", ".edu", ".gov", ".in"]) or target_clean.startswith("http") or target_clean.startswith("www")
        
        # Normalize site/app name (e.g. "netflix website" -> "netflix", "unity site" -> "unity")
        clean_name = AppLauncher._normalize_name(target_clean)
        
        action_args = None
        action_url = None
        target_path = None

        # --- 1. WEBSITE & DEFAULT BROWSER AUTOMATION ---
        if is_website_req or clean_name in AppLauncher.KNOWN_WEBSITES:
            # Check known websites map first
            if clean_name in AppLauncher.KNOWN_WEBSITES:
                base_url = AppLauncher.KNOWN_WEBSITES[clean_name]
            elif "." in target_clean and " " not in target_clean:
                base_url = target_clean if target_clean.startswith("http") else f"https://{target_clean}"
            else:
                base_url = f"https://www.{clean_name}.com"

            if query_encoded:
                if "youtube.com" in base_url or "youtube" in clean_name:
                    if "music" in clean_name:
                        action_url = f"https://music.youtube.com/search?q={query_encoded}"
                    else:
                        action_url = f"https://www.youtube.com/results?search_query={query_encoded}"
                elif "amazon" in clean_name:
                    action_url = f"https://www.amazon.in/s?k={query_encoded}"
                elif "google" in clean_name or "search" in clean_name:
                    action_url = f"https://www.google.com/search?q={query_encoded}"
                else:
                    action_url = f"{base_url}/search?q={query_encoded}"
            else:
                action_url = base_url

            # Save learned website domain to memory
            try:
                from backend.memory_manager import memory
                memory.save_fact(f"Website URL ({clean_name})", base_url)
            except Exception:
                pass

        # --- 2. YOUTUBE MUSIC / MEDIA ACTIONS ---
        elif target_clean in ["youtube_music", "youtube music", "yt music", "ytmusic"]:
            action_url = f"https://music.youtube.com/search?q={query_encoded}" if query_encoded else "https://music.youtube.com"

        elif target_clean in ["youtube", "yt"]:
            action_url = f"https://www.youtube.com/results?search_query={query_encoded}" if query_encoded else "https://www.youtube.com"

        elif target_clean in ["chrome", "google chrome", "browser"]:
            if query:
                if query.startswith("http://") or query.startswith("https://") or ("." in query and " " not in query):
                    action_url = query if query.startswith("http") else f"https://{query}"
                else:
                    action_url = f"https://www.google.com/search?q={query_encoded}"
            else:
                action_args = ["cmd.exe", "/c", "start", "", "chrome"]

        else:
            # --- 3. STANDARD OS APP LAUNCHER & SYSTEM SCAN ---
            known = AppLauncher.KNOWN_APPS.get(target_clean) or AppLauncher.KNOWN_APPS.get(clean_name)
            if known:
                if isinstance(known, str):
                    action_url = known
                else:
                    action_args = known
            else:
                target_path = AppLauncher._find_app_in_system(target_clean)
                if not target_path:
                    print(f"[OS Automation] App '{target}' not found on system indexer.")
                    return False

        def _run():
            try:
                if action_url:
                    print(f"[OS Automation] Opening in Default Browser / URI: {action_url}")
                    os.startfile(action_url)
                elif target_path:
                    print(f"[OS Automation] Launching via Path/Shortcut: {target_path}")
                    os.startfile(target_path)
                elif action_args:
                    print(f"[OS Automation] Launching securely with args: {action_args}")
                    subprocess.Popen(action_args, shell=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception as e:
                print(f"[OS Automation] Exception launching {target}: {e}")

        threading.Thread(target=_run, daemon=True).start()
        return True
