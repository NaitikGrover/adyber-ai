import os
import sys
import subprocess
import threading
import glob
import urllib.parse
import winreg

class AppLauncher:
    """Intelligent Multi-Tier OS Application, Desktop Shortcut & Web Launcher with Autonomous Memory Learning."""

    # Built-in Whitelisted Windows Apps and Native URI Protocols
    KNOWN_APPS = {
        # Core Productivity & Browsers
        "chrome": ["cmd.exe", "/c", "start", "", "chrome"],
        "google chrome": ["cmd.exe", "/c", "start", "", "chrome"],
        "edge": ["cmd.exe", "/c", "start", "", "msedge"],
        "microsoft edge": ["cmd.exe", "/c", "start", "", "msedge"],
        "firefox": ["cmd.exe", "/c", "start", "", "firefox"],
        "brave": ["cmd.exe", "/c", "start", "", "brave"],
        "code": ["cmd.exe", "/c", "code"],
        "vs code": ["cmd.exe", "/c", "code"],
        "vscode": ["cmd.exe", "/c", "code"],
        "visual studio code": ["cmd.exe", "/c", "code"],
        
        # Windows System Utilities
        "notepad": ["notepad.exe"],
        "calculator": ["calc.exe"],
        "calc": ["calc.exe"],
        "task manager": ["taskmgr.exe"],
        "taskmgr": ["taskmgr.exe"],
        "settings": "ms-settings:",
        "control panel": ["control.exe"],
        "cmd": ["cmd.exe"],
        "command prompt": ["cmd.exe"],
        "powershell": ["powershell.exe"],
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
        
        # Media & Gaming
        "vlc": ["cmd.exe", "/c", "vlc"],
        "discord": os.path.expandvars(r"%APPDATA%\Microsoft\Windows\Start Menu\Programs\Discord.lnk"),
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
        "my computer": ["explorer.exe"],
        "this pc": ["explorer.exe"],
        "downloads": ["explorer.exe", "shell:Downloads"],
        "documents": ["explorer.exe", "shell:Personal"],
        "pictures": ["explorer.exe", "shell:My Pictures"],
        "music": ["explorer.exe", "shell:My Music"],
        "videos": ["explorer.exe", "shell:My Video"],
        "desktop": ["explorer.exe", "shell:Desktop"]
    }

    # Pre-indexed Popular Web Services
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
        "kick": "https://kick.com",
        "kick.com": "https://kick.com",
        "kick streaming": "https://kick.com",
        "kik": "https://kick.com",
        "kik.com": "https://kick.com",
        "discord": "https://discord.com/app",
        "whatsapp": "https://web.whatsapp.com",
        "spotify": "https://open.spotify.com",
        "imdb": "https://www.imdb.com",
        "figma": "https://www.figma.com",
        "notion": "https://www.notion.so",
        "canva": "https://www.canva.com",
        "stackoverflow": "https://stackoverflow.com",
        "stack overflow": "https://stackoverflow.com",
        "monkeytype": "https://monkeytype.com"
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
        """Deep search across Windows Start Menu, Chrome/Edge Installed Apps, Desktops, LocalAppData, and PATH."""
        target_norm = AppLauncher._normalize_name(app_name)
        
        # Comprehensive search directories including Chrome/Edge PWAs and Start Menu
        search_globs = [
            os.path.expandvars(r'%ProgramData%\Microsoft\Windows\Start Menu\Programs\**\*.lnk'),
            os.path.expandvars(r'%APPDATA%\Microsoft\Windows\Start Menu\Programs\**\*.lnk'),
            os.path.expandvars(r'%APPDATA%\Microsoft\Windows\Start Menu\Programs\Chrome Apps\**\*.lnk'),
            os.path.expandvars(r'%APPDATA%\Microsoft\Windows\Start Menu\Programs\Edge Apps\**\*.lnk'),
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
        """Launches an application securely in a background thread, or performs deep-linked web automation with auto-learning."""
        target_clean = target.lower().strip()
        from backend.memory_manager import memory
        
        # Extract song/search query from query parameter OR target string
        raw_query = query.strip() if query else target_clean
        song_search_clean = raw_query
        for prefix in ["play song ", "play music ", "play ", "listen to ", "on youtube music", "on youtube", "on spotify", "youtube music", "yt music", "ytmusic", "spotify"]:
            song_search_clean = song_search_clean.replace(prefix, "")
        song_search_clean = song_search_clean.strip()
        
        song_query_encoded = urllib.parse.quote_plus(song_search_clean) if song_search_clean and song_search_clean not in ["music", "song", "youtube music", "yt music", "spotify"] else ""
        query_encoded = urllib.parse.quote_plus(query.strip()) if query else song_query_encoded

        # Explicit website request check: user MUST say "website", " site", "site ", "www.", "http", etc.
        is_explicit_website = any(kw in target_clean for kw in ["website", " site", "site ", "www.", "http://", "https://", ".com", ".org", ".io", ".net", ".ai", ".dev", ".edu", ".gov"]) or target_clean.startswith("http") or target_clean.startswith("www")
        
        clean_name = AppLauncher._normalize_name(target_clean)
        learned_key = f"Website URL ({clean_name})"
        
        action_args = None
        action_url = None
        target_path = None

        # --- STEP 1: EXPLICIT WEBSITE REQUESTS ---
        if is_explicit_website:
            if clean_name in AppLauncher.KNOWN_WEBSITES:
                base_url = AppLauncher.KNOWN_WEBSITES[clean_name]
            elif "." in target_clean and " " not in target_clean:
                base_url = target_clean if target_clean.startswith("http") else f"https://{target_clean}"
            else:
                base_url = f"https://www.{clean_name}.com"

            action_url = f"{base_url}/search?q={query_encoded}" if query_encoded else base_url
            memory.save_fact(learned_key, base_url)

        # --- STEP 2: LOCAL PC APP & INSTALLED PWA SHORTCUT SCAN (PRIORITY 1) ---
        else:
            # Check if there is an installed desktop application, Chrome PWA shortcut, or system utility
            local_shortcut = AppLauncher._find_app_in_system(target_clean)
            if local_shortcut:
                target_path = local_shortcut
                print(f"[OS Automation] Found installed desktop application/shortcut: {target_path}")
            
            # Check Known Apps dictionary
            elif (AppLauncher.KNOWN_APPS.get(target_clean) or AppLauncher.KNOWN_APPS.get(clean_name)):
                known = AppLauncher.KNOWN_APPS.get(target_clean) or AppLauncher.KNOWN_APPS.get(clean_name)
                if isinstance(known, str):
                    if known.startswith("http://") or known.startswith("https://") or ":" in known:
                        action_url = known
                    elif os.path.exists(known):
                        target_path = known
                    else:
                        action_args = ["cmd.exe", "/c", "start", "", known]
                else:
                    action_args = known

            # --- STEP 3: MEDIA PLAYBACK & SONG SEARCH ---
            elif any(kw in target_clean for kw in ["play", "music", "song", "spotify", "youtube_music", "youtube music", "yt music", "ytmusic"]):
                spotify_path = AppLauncher._find_app_in_system("spotify")

                if "spotify" in target_clean or (spotify_path and "youtube" not in target_clean):
                    action_url = f"spotify:search:{song_query_encoded}" if song_query_encoded else "spotify:"
                else:
                    action_url = f"https://music.youtube.com/search?q={song_query_encoded}" if song_query_encoded else "https://music.youtube.com"

            elif target_clean in ["youtube", "yt"]:
                action_url = f"https://www.youtube.com/results?search_query={query_encoded}" if query_encoded else "https://www.youtube.com"

            elif target_clean in ["chrome", "google chrome", "browser"]:
                if query:
                    action_url = query if query.startswith("http") else f"https://www.google.com/search?q={query_encoded}"
                else:
                    action_args = ["cmd.exe", "/c", "start", "", "chrome"]

            # --- STEP 4: AUTONOMOUS WEB DISCOVERY & MEMORY LEARNING ---
            else:
                learned_url = memory.data.get("facts", {}).get(learned_key)
                if learned_url:
                    print(f"[OS Automation] Using previously learned website from memory: {learned_url}")
                    action_url = f"{learned_url}/search?q={query_encoded}" if query_encoded else learned_url
                elif clean_name in AppLauncher.KNOWN_WEBSITES:
                    base_url = AppLauncher.KNOWN_WEBSITES[clean_name]
                    action_url = f"{base_url}/search?q={query_encoded}" if query_encoded else base_url
                    memory.save_fact(learned_key, base_url)
                else:
                    # Live Autonomous Web Discovery via DuckDuckGo
                    print(f"[OS Automation] App '{target}' not installed locally. Discovering official website via web search...")
                    discovered_url = None
                    try:
                        from backend.tools.web_search import WebSearchEngine
                        res = WebSearchEngine.search(f"{clean_name} official website")
                        for s in res.get("sources", []):
                            url = s.get("url", "")
                            if url and not any(skip in url for skip in ["google.com", "wikipedia.org", "bing.com", "duckduckgo.com"]):
                                parsed = urllib.parse.urlparse(url)
                                discovered_url = f"{parsed.scheme}://{parsed.netloc}"
                                break
                    except Exception as ex:
                        print(f"[OS Automation] Web search discovery error: {ex}")

                    if not discovered_url:
                        discovered_url = f"https://www.{clean_name}.com"

                    memory.save_fact(learned_key, discovered_url)
                    print(f"[OS Automation] Learned & saved website to memory: {learned_key} -> {discovered_url}")
                    action_url = f"{discovered_url}/search?q={query_encoded}" if query_encoded else discovered_url

        def _run():
            try:
                if target_path:
                    print(f"[OS Automation] Launching via Path/Shortcut: {target_path}")
                    os.startfile(target_path)
                elif action_url:
                    print(f"[OS Automation] Opening in Default Browser / URI: {action_url}")
                    os.startfile(action_url)
                elif action_args:
                    print(f"[OS Automation] Launching securely with args: {action_args}")
                    flags = 0
                    if os.name == 'nt':
                        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
                    subprocess.Popen(action_args, shell=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags)
            except Exception as e:
                print(f"[OS Automation] Launch exception for {target}: {e}")

        threading.Thread(target=_run, daemon=True).start()
        return True
