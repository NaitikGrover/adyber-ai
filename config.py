import os

HOTKEY_TRIGGER = "ctrl+space"
ALT_HOTKEY_TRIGGER = "ctrl+win"

ORB_SIZE = 80
ORB_TOP_MARGIN = 20

ORB_COLOR_IDLE = "#00d2ff"       # Neon cyan
ORB_COLOR_LISTENING = "#ff007f"  # Glowing pink
ORB_COLOR_PROCESSING = "#7a00ff" # Violet
ORB_COLOR_SPEAKING = "#00ff88"   # Emerald green

APP_NAME_DEFAULT = "Ady"

def get_data_dir():
    appdata = os.environ.get("APPDATA")
    if appdata:
        data_dir = os.path.join(appdata, "AdyberAI")
    else:
        data_dir = os.path.expanduser("~/.adyber")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir

