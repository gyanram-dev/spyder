# TimeBound

TimeBound is a lightweight, local-first Windows desktop application for time management, task organizing, and desktop reminders. Built using **React**, **TypeScript**, **Vite**, and **Tauri** (Rust backend).

---

## Features

- ⏱️ **Time-Based Task Management:** Organize tasks around deadlines and active focus sessions.
- 🔔 **Desktop Reminders:** Floating, native Windows reminder overlay for focus alerts.
- 🎯 **Focus-Oriented Workflow:** Minimalist desktop interface designed to eliminate distractions.
- 🖥️ **Native Windows Integration:** Native desktop tray, autostart support, and floating reminder window.
- ⚡ **Lightweight & Fast:** Low RAM and resource consumption powered by Rust and Tauri v2.
- 💾 **Local-First Architecture:** User data resides locally on your Windows machine.

---

## Screenshots

*(Screenshots will be added in upcoming releases)*

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Framer Motion
- **Desktop Runtime:** Tauri v2, Rust
- **Target Platform:** Windows 10 / 11 (x64)

---

## Windows Requirements

- **Operating System:** Windows 10 or Windows 11 (64-bit)
- **Runtime:** Microsoft Edge WebView2 Evergreen Runtime (pre-installed on Windows 10/11)

---

## Getting Started & Development

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (v20 recommended)
- [Rust Toolchain](https://www.rust-lang.org/tools/install) (MSVC target: `x86_64-pc-windows-msvc`)

### Setup

```bash
# Install node dependencies
npm ci

# Run development server (Vite)
npm run dev

# Run desktop development app (Tauri)
npx tauri dev
```

---

## Building & Verification

### Frontend Build
```bash
npm run build
```

### Rust Backend Check
```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

### Build Installer Bundle
```bash
npx tauri build
```

---

## Governance & Contributing

We welcome contributions! Please refer to the following governance documents before submitting pull requests:

- [CONTRIBUTING.md](CONTRIBUTING.md) — Guidelines for environment setup, branching (`feature/*`, `fix/*`, `refactor/*`, `docs/*`), and submitting PRs.
- [CODEOWNERS](.github/CODEOWNERS) — Project maintainer code ownership boundaries.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — Code of conduct standards.

---

## Security

Security reports are appreciated and handled promptly. Please review [SECURITY.md](SECURITY.md) for vulnerability reporting guidelines via GitHub Private Vulnerability Reporting.

---

## Releases & Updates

TimeBound incorporates auto-updating capabilities powered by Tauri's secure updater plugin. Releases are signed using Minisign cryptography and published via [GitHub Releases](https://github.com/gyanram-dev/spyder/releases).
