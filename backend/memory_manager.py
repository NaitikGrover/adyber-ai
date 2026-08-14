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
    """Manages persistent user identity, preferences, and conversation context."""

    def __init__(self):
        self.memory_path = MEMORY_FILE
        self._lock = threading.Lock()
        self.data = self._load_memory()

    def _load_memory(self) -> dict:
        if os.path.exists(self.memory_path):
            try:
                with open(self.memory_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    # If facts or history exist from previous session, return it
                    if isinstance(data, dict):
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
        # Ensure facts is a dictionary (migrate old list format if needed)
        if not isinstance(self.data.get("facts"), dict):
            self.data["facts"] = {}
        self.data["facts"][key] = value
        self.save_memory()

    def _should_save_conversation(self, user_text: str, ai_response: str, tool_used: str) -> bool:
        """Only save conversations that have future value. Skip greetings, app launches, and small talk."""
        user_lower = user_text.lower().strip()
        
        # Skip app/OS automation exchanges
        if tool_used and tool_used not in ("none", None, ""):
            return False
        if "<APP_START>" in ai_response:
            return False

        # Skip very short messages (likely greetings)
        if len(user_lower.split()) <= 3:
            return False

        # Skip pure greeting patterns
        greeting_phrases = [
            "hey", "hi", "hello", "how are you", "how r u", "hey ady",
            "hey lady", "good morning", "good night", "what's up", "wassup",
            "yo", "sup", "howdy", "hiya", "are you there", "you there"
        ]
        if any(user_lower == g or user_lower.startswith(g + " ") for g in greeting_phrases):
            return False

        # Skip if the user message is basically just a greeting with filler
        greeting_starters = ["hey ", "hi ", "hello ", "yo "]
        cleaned = user_lower
        for starter in greeting_starters:
            if cleaned.startswith(starter):
                cleaned = cleaned[len(starter):].strip()
        if len(cleaned.split()) <= 2:
            return False

        # Skip if response contains SEARCH_WEB (handled separately) or is a simple status reply
        trivial_responses = ["sure!", "okay!", "got it!", "alright!", "of course!"]
        if any(ai_response.lower().strip().startswith(t) and len(ai_response) < 60 for t in trivial_responses):
            return False

        return True

    def add_conversation(self, user_text: str, ai_response: str, tool_used: str = None):
        # Only save conversations with real future value
        if not self._should_save_conversation(user_text, ai_response, tool_used or "none"):
            return
            
        now = datetime.datetime.now()
        entry = {
            "user": user_text, 
            "assistant": ai_response, 
            "tool": tool_used or "none",
            "date": now.strftime("%Y-%m-%d"),
            "time": now.strftime("%I:%M %p")
        }
        self.data["conversation_history"].append(entry)
        # Keep only the last 20 meaningful exchanges
        if len(self.data["conversation_history"]) > 20:
            self.data["conversation_history"] = self.data["conversation_history"][-20:]
        self.save_memory()

    def clear_history(self):
        """Clears all conversation history, keeping name and facts intact."""
        with self._lock:
            self.data["conversation_history"] = []
            self.save_memory()

    def delete_conversation(self, index: int):
        """Deletes a specific conversation by its index."""
        with self._lock:
            if 0 <= index < len(self.data["conversation_history"]):
                self.data["conversation_history"].pop(index)
                self.save_memory()
                return True
            return False

    def get_memory_context_prompt(self) -> str:
        user_name = self.data.get("user_name", "")
        ai_name = self.data.get("ai_name", "Ady")
        recent = self.data.get("conversation_history", [])[-5:]
        
        history = ""
        for turn in recent:
            history += f"User: {turn['user']}\n{ai_name}: {turn['assistant']}\n"

        context = f"Your name is {ai_name}."
        if user_name:
            context += f" The user's name is {user_name}."
            
        facts = self.data.get("facts", {})
        if isinstance(facts, dict) and facts:
            context += f"\nKnown facts about the user: " + ", ".join([f"{k}: {v}" for k, v in facts.items()])

        if history:
            context += f"\nRecent Conversation History:\n{history}"
            
        # Inject Real-Time Clock
        now = datetime.datetime.now().strftime("%A, %B %d, %Y - %I:%M %p")
        context += f"\n[SYSTEM CLOCK: The current real-world date and time is {now}]"
        
        return context

memory = MemoryManager()
