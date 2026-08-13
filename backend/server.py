import sys
import os
import re

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import json
import secrets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body, Response, Depends, HTTPException, Header, Query, Request
from starlette.requests import HTTPConnection
from fastapi.middleware.cors import CORSMiddleware

from backend.llm_provider import llm_manager
from backend.memory_manager import memory
from audio.tts import get_tts_engine

from config import get_data_dir

# Generate a secure per-process token and save it for the Electron main process to read
API_TOKEN = secrets.token_hex(32)
TOKEN_PATH = os.path.join(get_data_dir(), ".api_token")
try:
    with open(TOKEN_PATH, "w", encoding="utf-8") as f:
        f.write(API_TOKEN)
except Exception as e:
    print(f"[Auth Error] Could not write .api_token: {e}")

async def verify_token(request: HTTPConnection, x_api_token: str = Header(None), token: str = Query(None)):
    if request.scope.get("type") == "http" and getattr(request, "method", None) == "OPTIONS":
        return
    provided = x_api_token or token
    if not provided or provided != API_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

app = FastAPI(title="Ady AI Backend Server", dependencies=[Depends(verify_token)])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_websockets = set()
main_loop = None
system_hotkey_listener = None

@app.get("/")
def root():
    ai_name = llm_manager.settings.get("ai_name", "Ady")
    return {"status": "online", "system": f"{ai_name} Assistant Backend Engine"}

@app.get("/memory")
def get_memory():
    return memory.data

@app.post("/clear-memory")
def clear_memory():
    memory.data = {
        "user_name": "",
        "ai_name": "Ady",
        "facts": {},
        "conversation_history": []
    }
    memory.save_memory()
    print("[Memory Reset] All persistent facts & conversation history cleared!")
    return {"status": "success", "message": "Memory completely wiped."}

@app.delete("/memory/history")
def delete_all_history():
    memory.clear_history()
    print("[Memory] All chat history cleared.")
    return {"status": "success"}

@app.delete("/memory/history/{index}")
def delete_specific_history(index: int):
    success = memory.delete_conversation(index)
    if success:
        print(f"[Memory] Deleted chat history at index {index}.")
        return {"status": "success"}
    return {"status": "error", "message": "Index out of bounds"}

@app.post("/sync-user-memory")
def sync_user_memory(payload: dict = Body({})):
    # Validate types and cap sizes to prevent oversized memory injection
    user_name = str(payload.get("user_name", ""))[:200]
    ai_name = str(payload.get("ai_name", "Ady"))[:50]
    facts_raw = payload.get("facts", {})
    history_raw = payload.get("conversation_history", [])

    # Ensure facts is a dict of string→string, max 100 entries
    if not isinstance(facts_raw, dict):
        facts_raw = {}
    facts = {str(k)[:100]: str(v)[:500] for k, v in list(facts_raw.items())[:100]}

    # Ensure history is a list of dicts, max 50 entries
    if not isinstance(history_raw, list):
        history_raw = []
    conversation_history = [
        entry for entry in history_raw[:50]
        if isinstance(entry, dict)
    ]

    # Preserve local history if incoming cloud history is empty but local has entries
    if not conversation_history and memory.data.get("conversation_history"):
        conversation_history = memory.data.get("conversation_history", [])

    # Merge facts rather than wiping local facts if cloud facts are empty
    merged_facts = {**memory.data.get("facts", {}), **facts}

    memory.data = {
        "user_name": user_name or memory.data.get("user_name", ""),
        "ai_name": ai_name or memory.data.get("ai_name", "Ady"),
        "facts": merged_facts,
        "conversation_history": conversation_history
    }
    memory.save_memory()
    print(f"[Cloud Memory Sync] Restored user memory ({len(memory.data['facts'])} facts, {len(memory.data['conversation_history'])} history messages).")
    return {"status": "success", "memory": memory.data}

@app.post("/wipe-user-session")
def wipe_user_session():
    memory.data = {
        "user_name": "",
        "ai_name": "Ady",
        "facts": {},
        "conversation_history": []
    }
    memory.save_memory()
    print("[Session Isolated] Wiped local session memory on logout.")
    return {"status": "success"}

@app.get("/settings")
def get_settings():
    return llm_manager.settings

@app.post("/settings")
def update_settings(payload: dict = Body(...)):
    updated = llm_manager.save_settings(payload)
    if "hotkey" in payload and system_hotkey_listener:
        system_hotkey_listener.set_hotkey(payload["hotkey"])
    return {"status": "success", "settings": updated}

@app.post("/save-onboarding-profile")
async def save_onboarding_profile(payload: dict = Body(...)):
    name = payload.get("username") or payload.get("name") or ""
    if name:
        memory.set_user_name(name)

    profile_desc = payload.get("profileDescription", "")
    if profile_desc:
        memory.save_fact("User Profile/About", profile_desc)

    language = payload.get("language", "")
    if language:
        memory.save_fact("Preferred Language", language)

    shortcut_key = payload.get("shortcutKey", "")
    if shortcut_key:
        memory.save_fact("Configured Shortcut Key", shortcut_key)
        llm_manager.save_settings({"hotkey": shortcut_key})
        if system_hotkey_listener:
            system_hotkey_listener.set_hotkey(shortcut_key)

    api_mode = payload.get("apiMode", "")
    if api_mode:
        llm_manager.save_settings({
            "mode": api_mode,
            "gemini_api_key": payload.get("apiKey", "") if api_mode == "free_key" else llm_manager.settings.get("gemini_api_key", "")
        })

    print(f"[Onboarding Training] Saved user facts & customized AI memory for '{name}'!")

    return {
        "status": "success",
        "name": name
    }

@app.get("/test-voice")
async def test_voice(voice: str = "en-US-AriaNeural", text: str = "Hi, I am your AI assistant. This is how my voice sounds."):
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text, voice, rate="+10%")
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
        return Response(content=bytes(audio_data), media_type="audio/mpeg")
    except Exception as e:
        return {"error": str(e)}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global main_loop
    main_loop = asyncio.get_running_loop()
    await websocket.accept()
    active_websockets.add(websocket)
    ai_name = llm_manager.settings.get("ai_name", "Ady")
    print(f"[WebSocket] Connected to {ai_name} Backend.")

    tts = get_tts_engine()

    try:
        while True:
            data_text = await websocket.receive_text()
            payload = json.loads(data_text)
            command_type = payload.get("type")

            if command_type == "PROCESS_TEXT":
                user_text = payload.get("text", "")
                if user_text:
                    await process_prompt_and_respond(user_text, websocket, tts)

    except WebSocketDisconnect:
        active_websockets.discard(websocket)
        print("[WebSocket] Frontend disconnected.")
    except Exception as e:
        active_websockets.discard(websocket)
        print(f"[WebSocket Error]: {e}")

async def generate_edge_tts(text: str) -> str:
    try:
        import edge_tts
        import base64
        import re
        # Clean markdown before speaking
        clean_text = re.sub(r'[*#_]', '', text).strip()
        if not clean_text:
            return None
        # en-US-AriaNeural is a stunningly realistic, fast female AI voice
        communicate = edge_tts.Communicate(clean_text, "en-US-AriaNeural", rate="+10%")
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
        if audio_data:
            return base64.b64encode(audio_data).decode('utf-8')
    except Exception as e:
        print(f"[Edge TTS Error]: {e}")
    return None

from backend.tools.os_automation import AppLauncher

async def process_prompt_and_respond(user_text: str, websocket: WebSocket, tts):
    ai_name = llm_manager.settings.get("ai_name", "Ady")

    await websocket.send_json({
        "type": "STATE_CHANGE", 
        "state": "processing", 
        "message": f"{ai_name} is thinking..."
    })

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(llm_manager.process_prompt, user_text),
            timeout=20.0
        )
    except asyncio.TimeoutError:
        print("[Agent Loop] Timeout waiting for AI response.")
        result = {"summary": "I'm sorry, the AI provider took too long to respond. Please check your internet connection or try again.", "sources": [], "tool": "none"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[Agent Loop Error]: {e}")
        result = {"summary": "I encountered an internal error. Please check the logs.", "sources": [], "tool": "none"}
    
    summary_text = result.get("summary", "Done.")
    sources = result.get("sources", [])
    tool_used = result.get("tool", "web_search")

    # [OS AUTOMATION] Intercept and launch apps or smart web searches!
    action_matches = list(re.finditer(r"<ACTION>(.*?)</ACTION>", summary_text, re.IGNORECASE | re.DOTALL))
    app_not_found = None

    for match in action_matches:
        try:
            action_data = json.loads(match.group(1).strip())
            target = action_data.get("target", "")
            query = action_data.get("query", "")
            
            target_clean = target.lower().strip()
            
            # Structural validation to prevent path traversal or direct executable invocation from web prompt injection
            if target_clean.startswith("file://") or any(ext in target_clean for ext in [".exe", ".bat", ".ps1", ".cmd", ".vbs"]):
                print(f"[Security] Blocked malicious action target: {target_clean}")
                continue
            
            # If it's a local app, actively verify it exists before allowing the AI to speak
            is_website = target_clean in ["chrome", "google chrome", "browser", "web", "youtube", "youtube_music", "yt music", "amazon", "amazon.com", "amazon.in"] or "." in target_clean.split(" ")[0] or target_clean.startswith("http")
            
            if not is_website:
                cmd = AppLauncher.KNOWN_APPS.get(target_clean)
                shortcut_path = None
                if not cmd:
                    shortcut_path = AppLauncher._find_app_in_start_menu(target_clean)
                
                if not cmd and not shortcut_path:
                    # FEEDBACK LOOP: Intercept failure!
                    app_not_found = target
                    break
            
            # App exists or is a web action, proceed with launch
            AppLauncher.launch_app(target, query)
        except json.JSONDecodeError:
            print("[OS Automation] Failed to parse JSON ACTION tag.")
            pass

    if app_not_found:
        print(f"[Agent Loop] Feedback triggered: '{app_not_found}' not found. Reprompting AI.")
        feedback_prompt = f"SYSTEM ERROR: The user asked to open '{app_not_found}', but it is NOT installed on their computer. Apologize and ask if they would like you to open the '{app_not_found}' website for them instead to download it. Do not output any action tags."
        
        # Override the summary_text by doing a 2nd pass LLM call
        # Call this in a thread to prevent blocking the async loop
        try:
            summary_text = llm_manager._execute_llm(feedback_prompt, llm_manager._load_system_prompt(), memory.get_memory_context_prompt(), "")
        except Exception as e:
            print(f"[Agent Loop] Failed to reprompt AI: {e}")
            summary_text = f"I could not find {app_not_found} on your computer. Would you like me to open the website for it instead?"
        # No tags to strip in the apology response
    else:
        # Strip all hidden tags from the successful spoken text
        summary_text = re.sub(r"<ACTION>.*?</ACTION>", "", summary_text, flags=re.IGNORECASE | re.DOTALL).strip()
        
        # [LONG-TERM MEMORY] Intercept and save user facts!
        fact_matches = re.finditer(r"<SAVE_FACT>(.*?)</SAVE_FACT>", summary_text, re.IGNORECASE)
        for match in fact_matches:
            fact_data = match.group(1).strip()
            if ":" in fact_data:
                key, val = fact_data.split(":", 1)
                memory.save_fact(key.strip(), val.strip())
        # Strip all memory tags from the spoken text
        summary_text = re.sub(r"<SAVE_FACT>.*?</SAVE_FACT>", "", summary_text, flags=re.IGNORECASE).strip()

    # Generate high-quality edge-tts neural voice audio for instant playback
    audio_b64 = await generate_edge_tts(summary_text)

    action_triggered = len(action_matches) > 0 and not app_not_found
    auto_close = llm_manager.settings.get("auto_close_panel", False)

    await websocket.send_json({
        "type": "ANSWER",
        "state": "speaking",
        "ai_name": ai_name,
        "summary": summary_text,
        "sources": sources,
        "tool": tool_used,
        "audio_base64": audio_b64,
        "action_triggered": action_triggered,
        "auto_close_panel": auto_close
    })

# Start Python Push-To-Talk System Hotkey Listener
def init_system_push_to_talk():
    try:
        from core.hotkey_listener import PushToTalkHotkeyListener
        from audio.stt import get_stt_engine
        import threading
        
        stt_engine = get_stt_engine()
        
        def on_press():
            print("[Push-To-Talk System] Ctrl+Space HELD -> Start Mic & STT")
            stt_engine.start_recording()
            if main_loop:
                for ws in list(active_websockets):
                    asyncio.run_coroutine_threadsafe(
                        ws.send_json({"type": "HOLD_START"}),
                        main_loop
                    )

        def on_release():
            print("[Push-To-Talk System] Ctrl+Space RELEASED -> Stop Mic & STT, Send to AI")
            if main_loop:
                for ws in list(active_websockets):
                    asyncio.run_coroutine_threadsafe(
                        ws.send_json({"type": "HOLD_RELEASE"}),
                        main_loop
                    )
            
            def process_audio():
                text = stt_engine.stop_and_transcribe()
                
                if text:
                    import re
                    # Auto-correct phonetic misinterpretations of "A D" back to "Ady"
                    text = re.sub(r'\b(a d|id|a a d|a-d|addy)\b', 'Ady', text, flags=re.IGNORECASE)

                if text and main_loop and active_websockets:
                    ws = list(active_websockets)[0]
                    asyncio.run_coroutine_threadsafe(
                        process_prompt_and_respond(text, ws, None),
                        main_loop
                    )
                elif not text and main_loop:
                    for ws in list(active_websockets):
                        asyncio.run_coroutine_threadsafe(
                            ws.send_json({
                                "type": "STATE_CHANGE",
                                "state": "idle",
                                "message": "No audio detected."
                            }),
                            main_loop
                        )

            threading.Thread(target=process_audio, daemon=True).start()

        global system_hotkey_listener
        saved_hotkey = llm_manager.settings.get("hotkey", "Ctrl+Shift")
        system_hotkey_listener = PushToTalkHotkeyListener(on_press_start=on_press, on_release_stop=on_release, hotkey_str=saved_hotkey)
        system_hotkey_listener.start()
    except Exception as e:
        print(f"[System Hotkey Init Warning]: {e}")

if __name__ == "__main__":
    init_system_push_to_talk()
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
