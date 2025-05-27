# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

StackWatch is a stack-based task management application transitioning from a Python/Flask web app to a Tauri desktop application. The core concept is LIFO (Last In, First Out) task management with automatic timer tracking and context notes.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Rust with Tauri v2
- **Database**: SQLite via sqlx
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
SQLite migrations are in `/src-tauri/migrations/`. The database is managed through sqlx.

## Project Structure

- `/src/` - React TypeScript frontend
- `/src-tauri/` - Rust Tauri backend
  - `/src-tauri/src/lib.rs` - Main library entry point
  - `/src-tauri/src/commands.rs` - Tauri command handlers
  - `/src-tauri/src/database.rs` - Database connection and queries
  - `/src-tauri/src/models.rs` - Data models
  - `/src-tauri/migrations/` - SQL migration files
- `/stackwatch/` - Legacy Python/Flask implementation (reference only)

## Development Notes

1. TypeScript is in strict mode with unused variable/parameter checks
2. No linting or test commands are currently configured
3. The project is mid-migration from Flask to Tauri
4. Database operations use async Rust with tokio runtime
5. Frontend communicates with backend via Tauri commands
6. Files in `src-tauri/migrations` can only be modified for the most recent script.

## TypeScript Guidelines
- Use `undefined` instead of `null` when possible in TypeScript code. But, `== null` is preferred for checking both `null` and `undefined`.

## Rust Development Tips
- Use `cargo nextest run` instead of `cargo test` for better testing experience.
