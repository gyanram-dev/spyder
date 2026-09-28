# Contributing to TimeBound

Thank you for your interest in contributing to **TimeBound**!

TimeBound is a lightweight, local-first Windows desktop time-management application built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Tauri** (Rust backend).

---

## Supported Platform

TimeBound is strictly a **Windows desktop application** (Windows 10/11 x64).

*Note: Linux and macOS platforms are intentionally unsupported.*

---

## Development Setup

### Prerequisites

Ensure you have the following installed on your Windows development environment:

- **Node.js**: v18 or later (v20+ recommended)
- **npm**: v9 or later
- **Rust Toolchain**: Stable MSVC toolchain (`x86_64-pc-windows-msvc`)
- **C++ Build Tools**: Visual Studio Build Tools (C++ workload) for Rust/Tauri compilation

### Installation

Clone the repository and install npm dependencies:

```bash
npm ci
```

---

## Development Workflow

### Running Development Build

To run the application locally with hot-reloading:

```bash
npm run dev
```

To launch the full Tauri app window locally:

```bash
npx tauri dev
```

### Building the Project

To build the frontend bundle:

```bash
npm run build
```

To build the desktop installer (`.exe` / `.msi` via NSIS):

```bash
npx tauri build
```

### Verifying Code & Testing

Validate TypeScript types, Vite bundling, and Rust compilation before submitting code:

1. **Frontend check & build:**
   ```bash
   npm run build
   ```

2. **Rust backend check:**
   ```bash
   cargo check --manifest-path src-tauri/Cargo.toml
   ```

---

## Git Workflow & Branching Strategy

The `main` branch serves as the **stable release branch**. Direct commits to `main` should be avoided in favor of pull requests.

### Branch Naming Conventions

All work should take place on dedicated topic branches created from `main`:

- `feature/<short-description>` — New application capabilities
- `fix/<short-description>` — Bug fixes
- `refactor/<short-description>` — Code cleanup and architecture improvements
- `docs/<short-description>` — Documentation updates

### Pull Request Process

1. Fork or branch from `main`.
2. Keep PRs focused, atomic, and clear.
3. Verify local build and checks (`npm run build`, `cargo check`).
4. Submit a Pull Request targeting `main`.
5. Complete the PR template checklist.

---

## Quality & Security Expectations

- **Clean Code:** Write clean, maintainable TypeScript and Rust code adhering to standard conventions.
- **Zero Secret Exposure:** NEVER include signing keys, certificates, tokens, passwords, or credentials in any commit or pull request.
- **Windows Integrity:** Ensure new frontend or native code maintains Windows window management, transparent reminder windows, and autostart capabilities without regression.

---

## Release Process Overview

Maintainers publish releases by tagging versions (e.g. `v0.1.7`) and creating signed Windows installer bundles.
Updates are verified using Minisign public key cryptography and distributed via Tauri's updater mechanism using `latest.json`.
