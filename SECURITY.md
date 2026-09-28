# Security Policy

## Supported Versions

The following table details which versions of TimeBound currently receive security updates:

| Version | Supported          |
| ------- | ------------------ |
| v0.1.7+ | :white_check_mark: |
| < 0.1.7 | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability within TimeBound, please report it responsibly:

- **DO NOT** disclose sensitive vulnerabilities publicly (such as via public GitHub Issues, public discussions, or social media) before they have been evaluated and addressed.
- Please report security concerns privately to the repository owner ([@gyanram-dev](https://github.com/gyanram-dev)) before any public disclosure.

### What to Include in a Report

To help us assess and resolve the issue quickly, please include:

1. A clear description of the vulnerability and its potential impact.
2. Step-by-step instructions or a minimal Proof of Concept (PoC) to reproduce the issue.
3. The affected component (e.g., frontend IPC call, Rust backend module, Tauri permission scope).
4. Any potential mitigations or recommendations if available.

We will acknowledge receipt of your report and provide status updates as we work to investigate and resolve the issue.

---

## Signing Key & Secret Management Policy

- **Private Keys & Secrets:** Signing keys (e.g. Tauri Minisign private key, code signing certificates) are held exclusively in isolated environment secrets for CI/CD or local release builds by maintainers.
- **Repository Cleanliness:** No private keys, certificates, passwords, or access tokens are ever stored inside the repository source code or public configuration files.
- **Public Key Integrity:** Only the public verification key is committed inside `src-tauri/tauri.conf.json` to allow the desktop client to securely verify release updates.
