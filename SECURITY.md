# Security Policy

> Version: **1.0.0**  
> Maintainer: **[Naitik Grover](https://github.com/NaitikGrover95)**

---

## Supported Versions

| Version | Security Support |
| ------- | ---------------- |
| 1.0.x   | Supported |
| < 1.0   | Not supported |

Security fixes are generally provided for the latest stable release.

---

## Reporting a Vulnerability

If you discover a security vulnerability in Adyber AI, please report it privately instead of opening a public issue.

You can submit a private vulnerability report through the **Security** tab of the GitHub repository.

When reporting an issue, please include:

1. A clear description of the vulnerability.
2. The potential security impact.
3. Steps to reproduce the issue.
4. A proof of concept, if available.
5. Any suggested mitigation or fix.

Please do not publicly disclose the vulnerability until it has been reviewed and addressed.

---

## Security Considerations

Adyber AI is a desktop application that can interact with local system resources, external AI providers, and web services. Users should only provide API credentials to services they trust and should keep their credentials private.

### Local API Key Storage

API keys for supported AI providers are stored locally on the user's system.

Depending on the application configuration, supported providers may include:

- NVIDIA

API credentials should never be committed to the repository or shared publicly.

### Local WebSocket Communication

The Electron frontend communicates with the Python backend through a local WebSocket connection.

The backend uses the loopback interface:

```text
127.0.0.1
