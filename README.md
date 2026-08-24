# 🎙️ Adyber AI — Desktop AI Voice Overlay & Web Intelligence Assistant

> Creator & Lead Developer: **Naitik Grover ([@NaitikGrover95](https://github.com/NaitikGrover95))**  
> Version: **1.0.0**

**Adyber AI** is an always-on desktop AI voice overlay assistant. It lives as a sleek, interactive **React Voice Orb** floating on your desktop screen. Triggered instantly via system hotkeys (`Ctrl + Win`, `Ctrl + Space`, or `Ctrl + Shift`), Adyber AI listens to your voice prompts, reasons with long-term memory, searches the live web for real-time information with clickable source citations, automates OS desktop tasks, and responds via Speech Synthesis (TTS).

---

## ✨ Core Capabilities

- 🔮 **Interactive Voice Orb UI**: Floating desktop overlay built with Electron & React 18, featuring animated states (`Idle`, `Listening`, `Thinking`, `Speaking`).
- ⚡ **Instant Push-To-Talk**: Trigger anywhere on Windows using `Ctrl + Win` or `Ctrl + Space`.
- 🌐 **Live Web Search & Clickable Citations**: Real-time web intelligence powered by search engines with interactive source link badges.
- 🧠 **Long-Term Memory**: Automatically remembers user identity, preferences, facts, and conversation history persistently across restarts (`backend/memory.json`).
- ⚙️ **3 AI Engine Modes**:
  1. **Free API Key Mode**: Supports Google Gemini, OpenAI, Claude, Groq, NVIDIA, and OpenRouter API keys.
  2. **Subscription Mode**: Pre-configured cloud AI model endpoint.
  3. **100% Offline Local Model Mode**: Runs 100% locally via Ollama (`http://127.0.0.1:11434`, e.g., `llama3` or `mistral`).
- 🖥️ **OS Automation Engine**: Native desktop application launching, direct YouTube/YouTube Music video playback, browser URL navigation, and media controls.
- 🔒 **Security & Isolation**: Local-first API key storage in `%APPDATA%`, loopback-isolated WebSockets with per-process random security tokens (`.api_token`), and thread-safe memory handling.

---

## 🛠️ Architecture & Tech Stack

```
[ Electron + React Desktop Overlay UI ]
         │
         │  WebSocket Protocol (ws://127.0.0.1:8000/ws?token=...)
         ▼
[ Python Backend Server (FastAPI + Uvicorn + WebSockets) ]
         ├── STT & TTS Engine (SpeechRecognition & Edge-TTS)
         ├── Long-Term Memory Manager (Thread-Safe JSON Fact Storage)
         ├── Multi-Provider LLM Provider (Gemini, OpenAI, Groq, Ollama)
         ├── Real-Time Web Search Tool Registry with Sources
         └── OS Automation & App Launcher (Direct Watch Playback)
```

### Stack Breakdown
- **Frontend**: Electron 29, React 18, Vite, Vanilla CSS / Tailwind CSS, Lucide Icons.
- **Backend**: Python 3.14+ (FastAPI, Uvicorn, WebSockets, SoundDevice, SpeechRecognition, Pyttsx3 / Edge-TTS).
- **Core Native Layer**: PyWin32, Windows API Virtual Key Hooks.

---

## 📁 Repository Structure

```
ady/
├── backend/
│   ├── server.py              # FastAPI server, WebSocket endpoints & auth
│   ├── llm_provider.py        # LLM Engine provider router & settings management
│   ├── memory_manager.py      # Thread-safe long-term memory & conversation store
│   ├── prompt.txt             # System prompt template
│   └── tools/
│       └── os_automation.py   # App launcher, URL router, YouTube direct playback
├── core/
│   └── hotkey_listener.py     # Windows VK hotkey parsing & push-to-talk listener
├── electron/
│   ├── main.cjs               # Electron main process, hotkey & window management
│   └── preload.cjs            # Secure contextBridge API bindings
├── src/
│   ├── App.jsx                # Core React application entry & state router
│   ├── components/            # UI components (Orb, Chat, ResponseCards, Settings)
│   └── main.jsx               # React DOM rendering
├── config.py                  # Global application configuration & version constants
├── build-win.cjs              # Build automation script for Windows targets
├── package.json               # Node.js dependencies & electron-builder scripts
├── requirements.txt           # Python backend dependencies
├── GEMINI.md                  # Development instructions & system rules
├── SECURITY.md                # Security policy & vulnerability reporting guidelines
└── CODEBASE_AUDIT.md          # Full code inspection & security audit documentation
```

---

## 🚀 Development Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/NaitikGrover/adyber-ai.git
   cd ady
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Start Application in Development**:
   ```bash
   npm start
   ```
   *Running `npm start` concurrently launches the Vite dev server and background Python backend server.*

---

## 📦 Production Builds

To package standalone Windows installers and portable executables:

```bash
# 1. Compile Python backend to standalone executable
python -m PyInstaller --noconfirm --clean --onedir --windowed --name "adyber-backend" --distpath "backend-dist" --workpath "backend-build" --add-data "backend;backend" backend/server.py

# 2. Package Electron distribution
npm run dist
```

Generated production files will be output to `release/`:
- **`release/Adyber AI Setup 1.0.0.exe`** (NSIS Interactive Installer)
- **`release/Adyber AI 1.0.0.exe`** (Portable Executable)

---

## 📜 License

This repository is published under a **Source-Available & Educational License**.

- 👁️ **Inspection & Learning**: You are welcome to inspect, study, and learn from this codebase.
- 🚫 **No Unauthorized Modifications/Derivatives**: Commercial usage, re-distribution, or public derivative works are strictly prohibited without prior written consent from the author.

For details, refer to the [LICENSE](LICENSE) file.
