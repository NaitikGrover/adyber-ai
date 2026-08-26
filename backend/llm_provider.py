import os
import json
import shutil
import urllib.request
import urllib.parse
from backend.memory_manager import memory
from backend.tools.web_search import WebSearchEngine
from config import get_data_dir

data_dir = get_data_dir()
SETTINGS_FILE = os.path.join(data_dir, "settings.json")
DEFAULT_SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "settings.example.json")
if not os.path.exists(SETTINGS_FILE) and os.path.exists(DEFAULT_SETTINGS_FILE):
    try:
        shutil.copy(DEFAULT_SETTINGS_FILE, SETTINGS_FILE)
    except Exception as e:
        print(f"[Settings] Could not copy default settings: {e}")

class LLMProviderManager:
    """Manages Multi-Provider AI Model execution with conversational multi-turn memory & web intelligence."""

    def __init__(self):
        self.settings_path = SETTINGS_FILE
        self.prompt_path = os.path.join(os.path.dirname(__file__), "prompt.txt")
        self.settings = self._load_settings()

    def _load_system_prompt(self) -> str:
        if os.path.exists(self.prompt_path):
            try:
                with open(self.prompt_path, "r", encoding="utf-8") as f:
                    return f.read().strip()
            except Exception:
                pass
        return "Answer concisely in 1-2 sentences. Speak conversationally."

    def _load_settings(self) -> dict:
        if os.path.exists(self.settings_path):
            try:
                with open(self.settings_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "mode": "free_key",
            "provider": "nvidia",
            "model": "meta/llama-3.1-8b-instruct",
            "ai_name": "Ady",
            "hotkey": "Ctrl+Win",
            "gemini_api_key": "",
            "claude_api_key": "",
            "openrouter_api_key": "",
            "openai_api_key": "",
            "groq_api_key": "",
            "nvidia_api_key": "",
            "ollama_url": "http://localhost:11434",
            "ollama_model": "llama3"
        }

    def save_settings(self, new_settings: dict) -> dict:
        self.settings.update(new_settings)
        if "ai_name" in new_settings:
            memory.set_ai_name(new_settings["ai_name"])
            
        try:
            with open(self.settings_path, "w", encoding="utf-8") as f:
                json.dump(self.settings, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[LLMProvider] Warning: Could not write settings.json: {e}")
        print(f"[LLMProvider] Settings updated securely: Mode = {self.settings.get('mode')}, Provider = {self.settings.get('provider')}, Model = {self.settings.get('model')}")
        return self.settings

    def _build_messages(self, prompt: str, persona_ctx: str, memory_ctx: str, web_info: str) -> list:
        """Constructs rich multi-turn message payload preserving recent dialogue context."""
        system_content = f"{persona_ctx}\n\n{memory_ctx}"
        if web_info:
            system_content += f"\n\n[Live Web Search Results & Context]:\n{web_info}"
            
        messages = [{"role": "system", "content": system_content}]
        recent = memory.get_recent_messages(max_turns=6)
        messages.extend(recent)
        messages.append({"role": "user", "content": prompt})
        return messages

    def _execute_llm(self, user_prompt: str, persona_ctx: str, memory_context: str, web_info: str) -> str:
        """Helper to run the configured LLM engine."""
        mode = self.settings.get("mode", "free_key")
        if not mode:
            mode = "free_key"
        provider = self.settings.get("provider", "gemini")
        model = self.settings.get("model", "")

        if mode == "adyber_free":
            return self._call_g4f_free(user_prompt, persona_ctx, memory_context, web_info, model)
        
        elif mode == "subscription":
            api_key = self.settings.get("openai_api_key")
            if api_key:
                return self._call_openai(user_prompt, persona_ctx, memory_context, web_info, api_key, model)
            return "Subscription mode active. Please add your OpenAI subscription API key in Settings."
            
        elif mode == "local_ollama" or provider == "ollama":
            url = self.settings.get("ollama_url", "http://localhost:11434")
            url_lower = url.lower().strip()
            if not (url_lower.startswith("http://localhost") or url_lower.startswith("http://127.0.0.1")):
                return f"Ollama URL must point to localhost. Current value '{url}' is not allowed."
            ollama_model = model or self.settings.get("ollama_model", "llama3")
            res = self._call_ollama(user_prompt, persona_ctx, memory_context, web_info, url, ollama_model)
            if res and "Error" not in res and not res.startswith("http"):
                return res
            return f"Could not connect to local Ollama at {url}. Please ensure Ollama is running (`ollama run {ollama_model}`)."
            
        elif mode == "free_key":
            current_key = (self.settings.get(f"{provider}_api_key") or self.settings.get(f"{provider}_key") or "").strip()
            if not current_key:
                for p_name in ["nvidia", "gemini", "openai", "groq", "claude", "openrouter"]:
                    candidate_key = (self.settings.get(f"{p_name}_api_key") or self.settings.get(f"{p_name}_key") or "").strip()
                    if candidate_key:
                        provider = p_name
                        break

            if provider == "gemini":
                key = self.settings.get("gemini_api_key") or self.settings.get("gemini_key")
                if key:
                    return self._call_gemini(user_prompt, persona_ctx, memory_context, web_info, key, model)
                return "Please enter your Google Gemini API Key in Settings, or select Built-In Free / Local Ollama model."
            elif provider == "claude":
                key = self.settings.get("claude_api_key")
                if key:
                    return self._call_claude(user_prompt, persona_ctx, memory_context, web_info, key, model)
                return "Please enter your Anthropic Claude API Key in Settings, or select Built-In Free / Local Ollama model."
            elif provider == "openrouter":
                key = self.settings.get("openrouter_api_key")
                if key:
                    return self._call_openrouter(user_prompt, persona_ctx, memory_context, web_info, key, model)
                return "Please enter your OpenRouter API Key in Settings, or select Built-In Free / Local Ollama model."
            elif provider == "openai":
                key = self.settings.get("openai_api_key")
                if key:
                    return self._call_openai(user_prompt, persona_ctx, memory_context, web_info, key, model)
                return "Please enter your OpenAI API Key in Settings, or select Built-In Free / Local Ollama model."
            elif provider == "groq":
                key = self.settings.get("groq_api_key")
                if key:
                    return self._call_groq(user_prompt, persona_ctx, memory_context, web_info, key, model)
                return "Please enter your Groq API Key in Settings, or select Built-In Free / Local Ollama model."
            elif provider == "nvidia":
                key = self.settings.get("nvidia_api_key")
                if key:
                    return self._call_nvidia(user_prompt, persona_ctx, memory_context, web_info, key, model)
                return "Please enter your NVIDIA API Key in Settings, or select Built-In Free / Local Ollama model."
            
            return f"Please enter your {provider.capitalize()} API Key in Settings, or select Built-In Free / Local Ollama model."
        
        return "No API Key configured. Please add your API Key in Settings, or switch to Built-In Free / Local Ollama model."

    def process_prompt(self, user_prompt: str) -> dict:
        memory_context = memory.get_memory_context_prompt()
        persona_ctx = self._load_system_prompt()

        # PASS 1: Let the AI think with multi-turn context
        final_answer = self._execute_llm(user_prompt, persona_ctx, memory_context, "")
        if final_answer is None:
            final_answer = ""
        sources = []
        tool_used = "none"

        # Heuristic fix: If user asks for news/weather/info without saying "open", force a web search
        import re
        if "<ACTION>" in final_answer and "<SEARCH_WEB>" not in final_answer:
            if any(k in user_prompt.lower() for k in ["news", "weather", "who is", "what is", "how much", "net worth", "price of"]):
                if "open" not in user_prompt.lower() and "launch" not in user_prompt.lower():
                    print("[Agent Loop] Heuristic: Converting incorrect ACTION into SEARCH_WEB")
                    final_answer = f"<SEARCH_WEB>{user_prompt}</SEARCH_WEB>"

        # If the AI decides it needs to search the web...
        search_match = re.search(r"<SEARCH_WEB>(.*?)</SEARCH_WEB>", final_answer, re.IGNORECASE)
        if search_match:
            search_query = search_match.group(1).strip()
            print(f"[Agent Loop] AI triggered Web Search for: {search_query}")
            
            search_res = WebSearchEngine.search(search_query)
            raw_summary = search_res.get("summary", "")
            sources = search_res.get("sources", [])
            
            # PASS 2: Re-prompt the AI with the live web context!
            print("[Agent Loop] Injecting live web results into AI brain...")
            strict_prompt = user_prompt + "\n\n(IMPORTANT: Use the Live Web Search Results to answer this concisely in plain spoken text. Do NOT output any <ACTION> or <SEARCH_WEB> tags.)"
            final_answer = self._execute_llm(strict_prompt, persona_ctx, memory_context, raw_summary)
            tool_used = "web_search"

        # Save facts if emitted
        save_fact_matches = re.finditer(r"<SAVE_FACT>(.*?)</SAVE_FACT>", final_answer, re.DOTALL | re.IGNORECASE)
        for match in save_fact_matches:
            fact_payload = match.group(1).strip()
            if ":" in fact_payload:
                key, val = fact_payload.split(":", 1)
                memory.save_fact(key.strip(), val.strip())
                print(f"[Agent Loop] Saved Learned Fact to Memory: '{key.strip()}' -> '{val.strip()}'")

        # Clean tags from final spoken summary
        clean_spoken_text = final_answer
        for tag in ["ACTION", "SEARCH_WEB", "SAVE_FACT"]:
            clean_spoken_text = re.sub(rf"<{tag}>.*?</{tag}>", "", clean_spoken_text, flags=re.DOTALL | re.IGNORECASE).strip()

        # Record conversation in multi-turn memory
        if clean_spoken_text and not clean_spoken_text.startswith("<"):
            memory.add_conversation(user_prompt, clean_spoken_text, tool_used=tool_used)
            
        return {"summary": final_answer, "sources": sources, "tool": tool_used}

    def _call_g4f_free(self, prompt: str, persona_ctx: str, memory_ctx: str, web_info: str, model: str = None) -> str:
        try:
            from g4f.client import Client
            client = Client()
            model_name = model or "gpt-4o-mini"
            messages = self._build_messages(prompt, persona_ctx, memory_ctx, web_info)
            try:
                response = client.chat.completions.create(model=model_name, messages=messages)
                return response.choices[0].message.content.strip()
            except Exception:
                response = client.chat.completions.create(model="llama-3-70b", messages=messages)
                return response.choices[0].message.content.strip()
        except ImportError:
            return "Free AI module 'g4f' is not installed. Please add an API key in settings."
        except Exception as e:
            return f"Network Error: All free AI providers are currently busy. Try again soon."

    def _call_openrouter(self, prompt: str, persona_ctx: str, memory_ctx: str, web_info: str, api_key: str, model: str = None) -> str:
        try:
            url = "https://openrouter.ai/api/v1/chat/completions"
            model_name = model or "meta-llama/llama-3.3-70b-instruct:free"
            messages = self._build_messages(prompt, persona_ctx, memory_ctx, web_info)
            payload = {
                "model": model_name,
                "messages": messages
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Ady Desktop AI"
            })
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            return f"OpenRouter Error: {str(e)}"

    def _call_gemini(self, prompt: str, persona_ctx: str, memory_ctx: str, web_info: str, api_key: str, model: str = None) -> str:
        clean_key = (api_key or "").strip()
        if not clean_key:
            return "Gemini API Key is empty. Please enter your Google Gemini API Key in Settings."

        raw_model = (model or "gemini-1.5-flash").strip()
        if raw_model.startswith("models/"):
            raw_model = raw_model.replace("models/", "")
            
        system_prompt = f"{persona_ctx}\n\n{memory_ctx}"
        if web_info:
            system_prompt += f"\n\n[Web Search Results / Context]:\n{web_info}"

        contents = []
        recent_turns = memory.get_recent_messages(max_turns=6)
        for msg in recent_turns:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": contents
        }
        
        models_to_try = [raw_model]
        fallback_candidates = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash", "gemini-flash-latest", "gemini-1.5-flash"]
        for candidate in fallback_candidates:
            if candidate not in models_to_try:
                models_to_try.append(candidate)

        last_error = ""
        for m_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_name}:generateContent?key={clean_key}"
            try:
                req = urllib.request.Request(
                    url, 
                    data=json.dumps(payload).encode('utf-8'), 
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=12) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
                    return "Gemini returned an empty response. Please try asking again."
            except urllib.error.HTTPError as e:
                try:
                    err_data = json.loads(e.read().decode('utf-8'))
                    msg = err_data.get('error', {}).get('message', str(e))
                    last_error = f"Gemini API Error ({m_name}): {msg}"
                except Exception:
                    last_error = f"Gemini API Error ({m_name}): {str(e)}"
            except Exception as e:
                last_error = f"Gemini Error ({m_name}): {str(e)}"

        return last_error

    def _call_claude(self, prompt: str, persona_ctx: str, memory_ctx: str, web_info: str, api_key: str, model: str = None) -> str:
        try:
            url = "https://api.anthropic.com/v1/messages"
            model_name = model or "claude-3-5-haiku-20241022"
            system_prompt = f"{persona_ctx}\n\n{memory_ctx}"
            if web_info:
                system_prompt += f"\n\n[Web Context]:\n{web_info}"

            recent_turns = memory.get_recent_messages(max_turns=6)
            messages = [{"role": m["role"], "content": m["content"]} for m in recent_turns]
            messages.append({"role": "user", "content": prompt})

            payload = {
                "model": model_name,
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": messages
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01"
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data["content"][0]["text"].strip()
        except Exception as e:
            return f"Claude Error: {str(e)}"

    def _call_openai(self, prompt: str, persona_ctx: str, memory_ctx: str, web_info: str, api_key: str, model: str = None) -> str:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            model_name = model or "gpt-4o-mini"
            messages = self._build_messages(prompt, persona_ctx, memory_ctx, web_info)
            payload = {
                "model": model_name,
                "messages": messages
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            return f"OpenAI Error: {str(e)}"

    def _call_groq(self, prompt: str, persona_ctx: str, memory_ctx: str, web_info: str, api_key: str, model: str = None) -> str:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            model_name = model or "llama-3.1-8b-instant"
            messages = self._build_messages(prompt, persona_ctx, memory_ctx, web_info)
            payload = {
                "model": model_name,
                "messages": messages
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            return f"Groq Error: {str(e)}"

    def _call_nvidia(self, prompt: str, persona_ctx: str, memory_ctx: str, web_info: str, api_key: str, model: str = None) -> str:
        try:
            url = "https://integrate.api.nvidia.com/v1/chat/completions"
            model_name = model or "meta/llama-3.1-8b-instruct"
            messages = self._build_messages(prompt, persona_ctx, memory_ctx, web_info)
            payload = {
                "model": model_name,
                "messages": messages,
                "temperature": 0.5,
                "top_p": 1,
                "max_tokens": 1024
            }
            req = urllib.request.Request(
                url, 
                data=json.dumps(payload).encode('utf-8'), 
                headers={
                    "Content-Type": "application/json", 
                    "Authorization": f"Bearer {api_key}"
                }
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            return f"NVIDIA Error: {str(e)}"

    def _call_ollama(self, prompt: str, persona_ctx: str, memory_ctx: str, web_info: str, url: str, model: str) -> str:
        try:
            endpoint = f"{url.rstrip('/')}/api/chat"
            messages = self._build_messages(prompt, persona_ctx, memory_ctx, web_info)
            payload = {
                "model": model,
                "messages": messages,
                "stream": False
            }
            req = urllib.request.Request(endpoint, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data.get("message", {}).get("content", "").strip()
        except Exception:
            pass
        return ""

llm_manager = LLMProviderManager()
