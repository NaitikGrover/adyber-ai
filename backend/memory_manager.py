import os
import json
import shutil
import threading
import datetime
from config import get_data_dir

data_dir = get_data_dir()
MEMORY_FILE = os.path.join(data_dir, "memory.json")
DEFAULT_MEMORY_FILE = os.path.join(os.path.dirname(__file__), "memory.json")
if not os.path.exists(MEMORY_FILE) and os.path.exists(DEFAULT_MEMORY_FILE):
    try:
        shutil.copy(DEFAULT_MEMORY_FILE, MEMORY_FILE)
    except Exception as e:
        print(f"[Memory] Could not copy default memory: {e}")

class MemoryManager:
    """Manages persistent user identity, preferences, and conversational multi-turn context."""

    def __init__(self):
        self.memory_path = MEMORY_FILE
        self._lock = threading.Lock()
        self.data = self._load_memory()

    def _load_memory(self) -> dict:
        if os.path.exists(self.memory_path):
            try:
                with open(self.memory_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        if not isinstance(data.get("facts"), dict):
                            data["facts"] = {}
                        if not isinstance(data.get("conversation_history"), list):
                            data["conversation_history"] = []
                        return data
            except Exception:
                pass
        return {
            "user_name": "",
            "ai_name": "Ady",
            "facts": {},
            "conversation_history": []
        }

    def save_memory(self):
        with self._lock:
            try:
                with open(self.memory_path, "w", encoding="utf-8") as f:
                    json.dump(self.data, f, indent=2, ensure_ascii=False)
            except Exception as e:
                print(f"[MemoryManager] Failed to write memory.json: {e}")

    def set_user_name(self, name: str):
        self.data["user_name"] = name
        self.save_memory()

    def set_ai_name(self, name: str):
        self.data["ai_name"] = name
        self.save_memory()

    def save_fact(self, key: str, value: str):
        if not isinstance(self.data.get("facts"), dict):
            self.data["facts"] = {}
        self.data["facts"][key] = value
        self.save_memory()

    def add_conversation(self, user_text: str, ai_response: str, tool_used: str = None):
        """Records dialogue turns to support fluid multi-turn context and follow-up queries."""
        u_clean = user_text.strip()
        a_clean = ai_response.strip()
        if not u_clean or not a_clean:
            return

        now = datetime.datetime.now()
        entry = {
            "user": u_clean, 
            "assistant": a_clean, 
            "tool": tool_used or "none",
            "date": now.strftime("%Y-%m-%d"),
            "time": now.strftime("%I:%M %p")
        }
        if not isinstance(self.data.get("conversation_history"), list):
            self.data["conversation_history"] = []
            
        self.data["conversation_history"].append(entry)
        # Keep the last 25 turns for rich multi-turn context
        if len(self.data["conversation_history"]) > 25:
            self.data["conversation_history"] = self.data["conversation_history"][-25:]
        self.save_memory()

    def get_recent_messages(self, max_turns: int = 6) -> list:
        """Returns structured role/content messages for modern LLM chat completion APIs."""
        history = self.data.get("conversation_history", [])[-max_turns:]
        messages = []
        for turn in history:
            u = turn.get("user", "").strip()
            a = turn.get("assistant", "").strip()
            if u:
                messages.append({"role": "user", "content": u})
            if a:
                messages.append({"role": "assistant", "content": a})
        return messages

    def clear_history(self):
        """Clears all conversation history, keeping name and facts intact."""
        with self._lock:
            self.data["conversation_history"] = []
            self.save_memory()

    def delete_conversation(self, index: int):
        """Deletes a specific conversation by its index."""
        with self._lock:
            if 0 <= index < len(self.data.get("conversation_history", [])):
                self.data["conversation_history"].pop(index)
                self.save_memory()
                return True
            return False

    def get_memory_context_prompt(self) -> str:
        user_name = self.data.get("user_name", "")
        ai_name = self.data.get("ai_name", "Ady")
        recent = self.data.get("conversation_history", [])[-6:]
        
        history = ""
        for turn in recent:
            history += f"User: {turn['user']}\n{ai_name}: {turn['assistant']}\n"

        context = f"Your name is {ai_name}."
        if user_name:
            context += f" The user's name is {user_name}."
            
        facts = self.data.get("facts", {})
        if isinstance(facts, dict) and facts:
            context += f"\nKnown facts & learned preferences: " + ", ".join([f"{k}: {v}" for k, v in facts.items()])

        if history:
            context += f"\nRecent Multi-Turn Conversation History (Use for follow-ups & context):\n{history}"
            
        # Inject Real-Time Clock
        now = datetime.datetime.now().strftime("%A, %B %d, %Y - %I:%M %p")
        context += f"\n[SYSTEM CLOCK: The current real-world date and time is {now}]"
        
        return context

memory = MemoryManager()
