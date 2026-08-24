# 🔒 Security Policy — Adyber AI Assistant

> Version: **1.0.0**  
> Lead Developer & Maintainer: **Naitik Grover ([@NaitikGrover95](https://github.com/NaitikGrover95))**

---

## 🛡️ Supported Versions

| Version | Security Status |
| ------- | --------------- |
| 1.0.x   | :white_check_mark: Supported |
| < 1.0   | :x: End of Life |

---

## 📩 Reporting a Vulnerability

We prioritize the privacy and security of users of **Adyber AI**. If you discover a potential vulnerability, credential exposure risk, or security issue, please report it responsibly.

### Reporting Channels
- **Email**: Send a security report to **[nAITIKgROVER95@GMAIL.COM](mailto:nAITIKgROVER95@GMAIL.COM)**.
- **GitHub**: Submit a private vulnerability report via the **Security** tab of the GitHub repository.

### Report Details
Please include:
1. Description of the vulnerability and its potential impact.
2. Step-by-step reproduction instructions or proof-of-concept.
3. Recommended remediations or security patches.

---

## ⏱️ Response & Disclosure SLA

- **Initial Response**: Within 48 hours.
- **Triage & Assessment**: Within 5 business days.
- **Patch Deployment**: Security hotfixes are released immediately upon verification prior to public disclosure.

---

## 🔒 Security Architecture Safeguards

Adyber AI enforces defense-in-depth security mechanisms:

1. **Local-First Sensitive Storage**:
   - API keys (Google Gemini, OpenAI, Groq, NVIDIA, Claude, OpenRouter) are saved strictly locally on the user's filesystem in `%APPDATA%\AdyberAI\settings.json`.
   - Keys are **never** transmitted to third-party telemetry servers.

2. **Loopback-Isolated WebSockets**:
   - Communication between Electron/React and Python occurs strictly on local loopback (`127.0.0.1:8000`).
   - Every application launch generates a cryptographically secure random token (`.api_token`) required on all WebSocket connections (`ws://127.0.0.1:8000/ws?token=...`).

3. **Input Validation & Thread Safety**:
   - Long-term memory modifications (`backend/memory_manager.py`) enforce string length limits, entry count caps, and strict `threading.Lock()` controls to prevent memory corruption or race conditions.
   - Ollama local model requests (`backend/llm_provider.py`) validate endpoints to prevent SSRF vulnerabilities.

4. **Secure OS Integration**:
   - App launching & web URL routing (`backend/tools/os_automation.py`) sanitizes inputs and uses direct URL schemes to prevent shell command injection.
