import threading
import time
import ctypes

VK_MAP = {
    "ctrl": 0x11,
    "control": 0x11,
    "lctrl": 0xA2,
    "rctrl": 0xA3,
    "shift": 0x10,
    "lshift": 0xA0,
    "rshift": 0xA1,
    "alt": 0x12,
    "menu": 0x12,
    "lalt": 0xA4,
    "ralt": 0xA5,
    "space": 0x20,
    "win": 0x5B,
    "lwin": 0x5B,
    "rwin": 0x5C,
    "capslock": 0x14,
    "caps": 0x14,
    "capital": 0x14,
    "tab": 0x09,
    "escape": 0x1B,
    "esc": 0x1B,
    "enter": 0x0D,
    "return": 0x0D,
    "backspace": 0x08,
}

# Dynamically populate A-Z (0x41-0x5A)
for char_code in range(ord('A'), ord('Z') + 1):
    char = chr(char_code).lower()
    VK_MAP[char] = char_code

# Dynamically populate 0-9 (0x30-0x39)
for num in range(10):
    VK_MAP[str(num)] = 0x30 + num

# Dynamically populate F1-F12 (0x70-0x7B)
for f in range(1, 13):
    VK_MAP[f"f{f}"] = 0x70 + (f - 1)

def parse_hotkey(hotkey_str: str):
    if not hotkey_str:
        return [0x11, 0xA0] # Default to Ctrl + Left Shift
    
    parts = [p.strip().lower() for p in hotkey_str.split("+") if p.strip()]
    vk_codes = []
    
    for part in parts:
        if part in VK_MAP:
            vk_codes.append(VK_MAP[part])
            
    # Require at least 2 distinct physical keys to prevent accidental single-key triggers (e.g. just pressing Ctrl)
    if len(vk_codes) < 2:
        print(f"[Kernel Hotkey Warning] Hotkey '{hotkey_str}' parsed to only {len(vk_codes)} key(s). Fallback to Ctrl+Shift.")
        return [0x11, 0xA0]
        
    return vk_codes

class PushToTalkHotkeyListener:
    """Hardware Kernel State Poller for Hold-To-Speak:
    Dynamically detects physical key press and release of user's configured shortcut combination.
    """

    def __init__(self, on_press_start, on_release_stop, hotkey_str="Ctrl+Shift"):
        self.on_press_start = on_press_start
        self.on_release_stop = on_release_stop
        self.is_holding = False
        self._running = False
        self._thread = None
        self.target_vks = parse_hotkey(hotkey_str)
        self.hotkey_str = hotkey_str

    def set_hotkey(self, hotkey_str: str):
        self.hotkey_str = hotkey_str
        self.target_vks = parse_hotkey(hotkey_str)
        print(f"[Kernel Hotkey] Target hotkey set to '{self.hotkey_str}' (VKs: {self.target_vks})")

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._thread.start()
        print(f"[Push-To-Talk Kernel Listener] Active for '{self.hotkey_str}' (VKs: {self.target_vks}).")

    def stop(self):
        self._running = False

    def _poll_loop(self):
        user32 = ctypes.windll.user32

        while self._running:
            try:
                # Check MSB 0x8000 for current physical key states
                # Must have at least 2 keys and ALL keys must be held down simultaneously
                all_pressed = len(self.target_vks) >= 2 and all(bool(user32.GetAsyncKeyState(vk) & 0x8000) for vk in self.target_vks)

                if all_pressed and not self.is_holding:
                    self.is_holding = True
                    print(f"[Kernel Hotkey {self.hotkey_str}] HELD -> Start AI Pill")
                    if self.on_press_start:
                        self.on_press_start()

                elif not all_pressed and self.is_holding:
                    self.is_holding = False
                    print(f"[Kernel Hotkey {self.hotkey_str}] RELEASED -> Stop AI Pill & Submit Prompt")
                    if self.on_release_stop:
                        self.on_release_stop()

            except Exception as e:
                print(f"[Kernel Hotkey Error]: {e}")

            time.sleep(0.015) # Poll every 15ms for instant key release response
