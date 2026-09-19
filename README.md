# Adyber AI

Adyber AI is an open-source desktop AI assistant for Windows. It runs as a voice-controlled overlay and can understand natural language, search the web, remember information, and perform tasks on your computer.

Developed and maintained by **[Naitik Grover](https://github.com/NaitikGrover95)**.

---

## Features

- **Voice assistant** - Interact with Adyber AI using voice commands from anywhere on your desktop.
- **Desktop overlay** - A floating interface built with Electron and React.
- **Global hotkeys** - Activate the assistant using `Ctrl + Win`, `Ctrl + Space`, or `Ctrl + Shift`.
- **Web search** - Search the web for current information and view sources from the results.
- **Long-term memory** - Store user preferences, facts, and conversation data locally.
- **Multiple AI providers** - Supports Gemini, OpenAI, Claude, Groq, NVIDIA, OpenRouter, and Ollama.
- **Local AI support** - Run supported models locally through Ollama.
- **Desktop automation** - Open applications, navigate to URLs, control media, and perform other desktop tasks.
- **Text-to-speech** - Respond to users using speech synthesis.
- **Local configuration** - Store application settings and API credentials locally.

---

## Tech Stack

### Frontend

- Electron
- React 18
- Vite
- Tailwind CSS
- Lucide Icons

### Backend

- Python
- FastAPI
- Uvicorn
- WebSockets
- SpeechRecognition
- Edge-TTS
- SoundDevice

### Windows Integration

- PyWin32
- Windows API
- Native keyboard shortcuts

---

## Architecture

    [ Electron + React Desktop UI ]
                  |
                  | WebSocket
                  v
           [ Python Backend ]
                  |
                  ├── Speech Recognition
                  ├── Text-to-Speech
                  ├── LLM Provider
                  ├── Long-Term Memory
                  ├── Web Search
                  └── Desktop Automation

---

## Project Structure

    adyber-ai/
    ├── backend/
    │   ├── server.py
    │   ├── llm_provider.py
    │   ├── memory_manager.py
    │   ├── prompt.txt
    │   └── tools/
    │       └── os_automation.py
    ├── core/
    │   └── hotkey_listener.py
    ├── electron/
    │   ├── main.cjs
    │   └── preload.cjs
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   └── main.jsx
    ├── config.py
    ├── build-win.cjs
    ├── package.json
    ├── requirements.txt
    ├── GEMINI.md
    ├── SECURITY.md
    └── CODEBASE_AUDIT.md

---

## Installation

### Requirements

- Windows
- Node.js 18 or later
- Python 3.10 or later
- npm

### Clone the Repository

    git clone https://github.com/NaitikGrover95/adyber-ai.git
    cd adyber-ai

### Install Node Dependencies

    npm install

### Install Python Dependencies

    pip install -r requirements.txt

### Run in Development

    npm start

This starts the Vite development server and the Python backend.

---

## AI Providers

Adyber AI supports multiple AI providers:

- Google Gemini
- OpenAI
- Anthropic Claude
- Groq
- NVIDIA
- OpenRouter
- Ollama

For local models, Ollama can be used to run supported models directly on your computer.

---

## Production Build

To create a Windows build, first compile the Python backend:

    python -m PyInstaller --noconfirm --clean --onedir --windowed --name "adyber-backend" --distpath "backend-dist" --workpath "backend-build" --add-data "backend;backend" backend/server.py

Then build the Electron application:

    npm run dist

The generated files will be placed in the `release/` directory.

---

## License

This project is published under a **Source-Available & Educational License**.

- You are free to inspect and study the source code.
- Commercial use is not permitted without prior written permission.
- Redistribution and public derivative works are not permitted without prior written permission.

See the [LICENSE](LICENSE) file for the complete terms.
