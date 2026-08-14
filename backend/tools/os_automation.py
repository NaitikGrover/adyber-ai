import os
import subprocess
import threading
import urllib.parse

class AppLauncher:
    """Secure OS Automation Tool for launching local applications."""

    # Whitelist of common Windows apps, system tools, and shell folders
    # Values are either a list of args for subprocess, or a URI string for os.startfile
    KNOWN_APPS = {
        # Browsers & Standard
        "chrome": ["cmd.exe", "/c", "start", "", "chrome"],
        "google chrome": ["cmd.exe", "/c", "start", "", "chrome"],
        "edge": ["cmd.exe", "/c", "start", "", "msedge"],
        "microsoft edge": ["cmd.exe", "/c", "start", "", "msedge"],
        "firefox": ["cmd.exe", "/c", "start", "", "firefox"],
        "notepad": ["notepad.exe"],
        "calculator": ["calc.exe"],
        "calc": ["calc.exe"],
        "paint": ["mspaint.exe"],
        "ms paint": ["mspaint.exe"],
        "wordpad": ["write.exe"],
        "snipping tool": ["snippingtool.exe"],
        
        # Office Suite
        "word": ["cmd.exe", "/c", "start", "", "winword"],
        "ms word": ["cmd.exe", "/c", "start", "", "winword"],
        "excel": ["cmd.exe", "/c", "start", "", "excel"],
        "powerpoint": ["cmd.exe", "/c", "start", "", "powerpnt"],
        
        # Dev & Media
        "spotify": ["cmd.exe", "/c", "start", "", "spotify"],
        "youtube": "https://www.youtube.com",
        "youtube music": "https://music.youtube.com",
        "youtube premium": "https://music.youtube.com",
        "vs code": ["cmd.exe", "/c", "code"],
        "vscode": ["cmd.exe", "/c", "code"],
        "visual studio code": ["cmd.exe", "/c", "code"],
        "discord": ["Update.exe", "--processStart", "Discord.exe"],
        "whatsapp": "whatsapp:",
        
        # System Folders
        "explorer": ["explorer.exe"],
        "file explorer": ["explorer.exe"],
        "recycle bin": ["explorer.exe", "shell:RecycleBinFolder"],
        "this pc": ["explorer.exe", "shell:MyComputerFolder"],
        "documents": ["explorer.exe", "shell:Personal"],
        "downloads": ["explorer.exe", "shell:Downloads"],
        "pictures": ["explorer.exe", "shell:My Pictures"],
        
        # System Tools
        "cmd": ["cmd.exe"],
        "command prompt": ["cmd.exe"],
        "powershell": ["powershell.exe"],
        "task manager": ["taskmgr.exe"],
        "control panel": ["control.exe"],
        "settings": "ms-settings:",
        "device manager": ["devmgmt.msc"],
        "registry editor": ["regedit.exe"],
        "system information": ["msinfo32.exe"],
        
        # Default Windows Apps
        "photos": "ms-photos:",
        "camera": "microsoft.windows.camera:",
        "clock": "ms-clock:",
        "alarms": "ms-clock:",
        "weather": "bingweather:",
        "maps": "bingmaps:",
        "store": "ms-windows-store:",
        "microsoft store": "ms-windows-store:"
    }

    @staticmethod
    def _find_app_in_start_menu(app_name: str) -> str:
        """Scans the Windows Start Menu dynamically for .lnk shortcuts matching the requested app."""
        import glob
        paths = [
            os.path.expandvars(r'%ProgramData%\Microsoft\Windows\Start Menu\Programs\**\*.lnk'),
            os.path.expandvars(r'%APPDATA%\Microsoft\Windows\Start Menu\Programs\**\*.lnk')
        ]
        links = []
        for p in paths:
            links.extend(glob.glob(p, recursive=True))
            
        target = app_name.lower().replace(" ", "")
        
        for link in links:
            filename = os.path.basename(link).lower()
            clean_filename = filename.replace(".lnk", "").replace(" ", "")
            # Basic fuzzy match: if the requested app is in the shortcut name, or vice versa
            if target in clean_filename or clean_filename in target:
                return link
        return None

    @staticmethod
    def launch_app(target: str, query: str = "") -> bool:
        """Launches a whitelisted application securely in a background thread, or performs deep-linked web automation."""
        target_clean = target.lower().strip()
        query_encoded = urllib.parse.quote_plus(query.strip()) if query else ""
        
        action_args = None
        action_url = None
        shortcut_path = None

        # --- NEW BROWSER AUTOMATION LOGIC ---
        if target_clean in ["amazon", "amazon.com", "amazon.in", "amazon india"]:
            action_url = f"https://www.amazon.in/s?k={query_encoded}" if query_encoded else "https://www.amazon.in"
        elif target_clean in ["youtube_music", "youtube music", "yt music"]:
            if query_encoded:
                def _play_yt_music():
                    final_url = f"https://music.youtube.com/search?q={query_encoded}"
                    try:
                        import urllib.request, re
                        req = urllib.request.Request(f"https://www.youtube.com/results?search_query={query_encoded}", headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                        html = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
                        match = re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
                        if match:
                            vid = match.group(1)
                            final_url = f"https://music.youtube.com/watch?v={vid}"
                    except Exception:
                        pass
                    # Securely launch Chrome with --app flag via Popen list
                    subprocess.Popen(["cmd.exe", "/c", "start", "", "chrome", f"--app={final_url}"], shell=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                threading.Thread(target=_play_yt_music, daemon=True).start()
                return True
            else:
                action_args = ["cmd.exe", "/c", "start", "", "chrome", '--app="https://music.youtube.com"']
        elif target_clean == "youtube":
            action_url = f"https://www.youtube.com/results?search_query={query_encoded}" if query_encoded else "https://www.youtube.com"
        elif target_clean in ["chrome", "google chrome", "browser", "web"]:
            if query:
                if query.startswith("http") or query.startswith("www.") or "." in query.split(" ")[0]:
                    action_url = query if query.startswith("http") else f"https://{query}"
                else:
                    action_url = f"https://www.google.com/search?q={query_encoded}"
            else:
                action_args = ["cmd.exe", "/c", "start", "", "chrome"]
        else:
            # --- FALLBACK STANDARD OS LAUNCHER LOGIC ---
            known = AppLauncher.KNOWN_APPS.get(target_clean)
            if known:
                if isinstance(known, str):
                    action_url = known
                else:
                    action_args = known
            else:
                shortcut_path = AppLauncher._find_app_in_start_menu(target_clean)
                if not shortcut_path:
                    print(f"[OS Automation] App '{target}' not found. Falling back to web search.")
                    action_url = f"https://www.google.com/search?q={urllib.parse.quote_plus(target_clean)}+download"

        def _run():
            try:
                if action_url:
                    print(f"[OS Automation] Launching URL/URI: {action_url}")
                    os.startfile(action_url)
                elif shortcut_path:
                    print(f"[OS Automation] Launching via Indexer: {shortcut_path}")
                    os.startfile(shortcut_path)
                elif action_args:
                    print(f"[OS Automation] Launching securely with args: {action_args}")
                    subprocess.Popen(action_args, shell=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception as e:
                print(f"[OS Automation] Failed to launch {target}: {e}")

        threading.Thread(target=_run, daemon=True).start()
        return True
