# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

StackWatch is a stack-based task management application transitioning from a Python/Flask web app to a Tauri desktop application. The core concept is LIFO (Last In, First Out) task management with automatic timer tracking and context notes.

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Rust with Tauri v2
- **Database**: Dexie (IndexedDB) for frontend-only storage
- **Legacy**: Python/Flask web app in `/stackwatch/` directory

### Key Concepts
- Tasks are managed in a stack structure (LIFO)
- Each task has an automatic timer that never stops
- Tasks include context notes that save/restore on switching
- "Idle" tasks are special - their timers reset on switch

## Common Commands

### Development
```bash
# Start frontend dev server
npm run dev

# Start Tauri development (frontend + backend)
npm run tauri dev

# Build production app
npm run tauri build

# Run tests
npm run test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui
```

### Backend (Rust)
```bash
# Build Rust backend
cd src-tauri && cargo build

# Run Rust backend
cd src-tauri && cargo run

# Check Rust code
cd src-tauri && cargo check

# Format Rust code
cd src-tauri && cargo fmt
```

### Database
The application uses Dexie (IndexedDB) for local data storage in `/src/db/database.ts`. All data is stored client-side in the browser's IndexedDB.

## Project Structure

- `/src/` - React TypeScript frontend
  - `/src/components/` - React components
  - `/src/hooks/` - Custom React hooks
  - `/src/db/` - Dexie database schema and operations
- `/src-tauri/` - Rust Tauri backend
  - `/src-tauri/src/lib.rs` - Main library entry point
  - `/src-tauri/src/commands.rs` - Tauri command handlers
  - `/src-tauri/src/error.rs` - Error handling types
- `/stackwatch/` - Legacy Python/Flask implementation (reference only)

## Development Notes

1. TypeScript is in strict mode with unused variable/parameter checks
2. Tests are set up with Vitest and can be run with `npm run test`
3. The project has completed migration from Flask to Tauri for desktop functionality
4. All data persistence is handled in the frontend using Dexie (IndexedDB)
5. Backend only handles window management operations (toggle floating window, focus main window)
6. All Tauri imports use dynamic imports for web compatibility

## TypeScript Guidelines
- Use `undefined` instead of `null` when possible in TypeScript code. But, `== null` is preferred for checking both `null` and `undefined`.

## Rust Development Tips
- Use `cargo nextest run` instead of `cargo test` for better testing experience.
