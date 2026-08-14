# Security Policy — Adyber AI Assistant

## Supported Versions

The following table lists the versions of Adyber AI currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

We take the security and privacy of **Adyber AI** very seriously. If you discover a potential security vulnerability or data exposure issue, please report it responsibly.

### How to Report
- **Email**: Send a detailed report to **[nAITIKgROVER95@GMAIL.COM](mailto:nAITIKgROVER95@GMAIL.COM)**.
- **GitHub**: You may also submit a private security advisory through the **Security** tab of this repository.

Please include:
1. A description of the vulnerability and its potential impact.
2. Steps to reproduce the issue (including any proof-of-concept scripts).
3. Any suggested remediations or mitigations.

---

## Preferred Response & Disclosure Timeline

- **Acknowledgement**: Within 48 hours.
- **Assessment**: Within 5 business days.
- **Fix & Disclosure**: We aim to release a patch for verified critical vulnerabilities as quickly as possible before public disclosure.

---

## Security Architecture & Best Practices

Adyber AI is designed with privacy and security as core principles:

1. **Local-First Key Management**:
   - API keys (Gemini, OpenAI, Groq, NVIDIA, Claude, OpenRouter) are stored exclusively on your local device in `%APPDATA%\AdyberAI\settings.json`.
   - Keys are **never** uploaded to external servers or telemetry services.

2. **Loopback WebSocket Authentication**:
   - Communication between the Electron React UI and Python backend occurs strictly over local loopback (`127.0.0.1`).
   - Every session generates a cryptographically random per-process token (`.api_token`) to prevent unauthorized local process connections.

3. **Secure Protocol Deep-Linking**:
   - Google Sign-In authentication uses hosted Firebase Web Auth (`https://adyber-d615d.firebaseapp.com/auth.html`) and dispatches tokenized payloads back to the app via the registered `adyber://` custom OS protocol.
