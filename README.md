# TimeBound

A lightweight desktop time-management application built with React, TypeScript, Vite, and Tauri.

TimeBound helps you stay focused by organizing tasks around time, deadlines, and reminders.

## Features

- ⏱️ Time-based task management
- 🔔 Desktop reminders
- 🎯 Focus-oriented workflow
- 🖥️ Native Windows desktop application
- ⚡ Lightweight and fast
- 💾 Local-first application architecture
- 🎨 Clean, minimal interface

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Desktop
- Tauri
- Rust

## Project Structure

```text
timebound/
├── src/
│   ├── App.tsx
│   ├── ReminderWindow.tsx
│   ├── audioStore.ts
│   └── ...
│
├── src-tauri/
│   ├── src/
│   ├── tauri.conf.json
│   └── ...
│
├── public/
├── package.json
└── vite.config.ts
