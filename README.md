# 🎙️ Adyber AI — Desktop AI Voice Overlay & Web Intelligence Assistant

> Created by **Pritha ReelBee**

**Adyber AI** is a futuristic, always-on desktop AI voice overlay assistant. It lives as a floating, interactive **React Voice Orb** at the top of your screen. Triggered instantly by a system hotkey (`Ctrl + Win` or `Ctrl + Shift`), Adyber AI listens to your voice prompt, reasons using long-term memory, searches the live web for up-to-date facts, automates OS desktop tasks, and responds aloud via Text-to-Speech (TTS) alongside clickable source citations.

---

## ✨ Key Features

- 🔮 **Floating Voice Orb UI**: Seamless desktop overlay built with React and custom Orb animations (`Idle`, `Listening`, `Thinking`, `Speaking`).
- ⚡ **Instant Push-To-Talk**: Trigger with system hotkeys (`Ctrl + Win` or `Ctrl + Shift`).
- 🌐 **Live Web Search & Clickable Citations**: Real-time web intelligence powered by search engines with interactive source link badges.
- 🧠 **Long-Term Memory**: Automatically remembers user identity, preferences, facts, and conversation context across application restarts and Firebase cloud sync.
- ⚙️ **3 AI Engine Modes**:
  1. **Free API Key Mode**: Supports Google Gemini, OpenAI, Claude, Groq, and NVIDIA API keys.
  2. **Subscription Mode**: Built-in cloud AI model endpoint out-of-the-box.
  3. **100% Offline Local Model Mode**: Connects directly to local Ollama (`http://localhost:11434`, e.g., `llama3` or `mistral`).
- 🖥️ **OS Automation Engine**: Secure native desktop controls (launching apps, opening browser URLs, volume control).
- 🔒 **Secure Desktop Architecture**: Built-in single-instance enforcement, tokenized WebSocket isolation, and `%APPDATA%` writable storage.

---

## 🛠️ Architecture & Tech Stack

```
[ Electron + React Desktop Overlay UI ]
         │
         │  WebSocket Protocol (ws://127.0.0.1:8000/ws?token=...)
         ▼
[ Python Backend Server (FastAPI + Uvicorn + WebSockets) ]
         ├── Speech-To-Text (STT) & Speech Synthesis (TTS Engine)
         ├── Long-Term & Session Memory Manager
         ├── Multi-Provider LLM Engine Manager
         ├── Real-Time Web Search Tool Registry
         └── OS Automation Module
```

- **Frontend**: Electron, React 18, Vite, Tailwind CSS / Vanilla CSS, Lucide Icons, Orb UI.
- **Backend**: Python 3.14+ (FastAPI, Uvicorn, WebSockets, SoundDevice, SpeechRecognition, Edge-TTS).

---

## 🚀 Quick Start (Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.10+)

### Setup
```bash
# 1. Clone the repository
git clone https://github.com/your-username/adyber-ai.git
cd adyber-ai

# 2. Install Node dependencies
npm install

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Start the Application
npm start
```

*Note: Running `npm start` automatically starts both the Vite dev server and the background Python server process.*

---

## 📦 Building Production Executables

To build standalone Windows `.exe` packages:

```bash
npm run build
npx electron-builder --win
```

The generated installers and standalone executables will be located in the `release/` directory:
- **`Adyber AI Setup 1.0.0.exe`** (Interactive NSIS Setup Installer)
- **`Adyber AI 1.0.0.exe`** (Portable Executable)

---

## 📜 License & Terms of Use

This repository is published under a **Source-Available & Educational License**.

- 👁️ **Learning & Inspection**: You are welcome to view, inspect, study, and learn from this codebase.
- 🚫 **No Modifications or Derivatives**: Modification, redistribution, derivative works, or commercial usage of this codebase is strictly prohibited without explicit authorization.

See the full terms in the [LICENSE](LICENSE) file.
