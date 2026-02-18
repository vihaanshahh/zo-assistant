# Zo

> Minimal overlay chat for Zo

A lightweight desktop overlay that lets you chat with Zo from anywhere. Always on top, always ready.

## Features

- **Floating Overlay** - Stays above all windows, accessible from any app
- **Global Hotkey** - Toggle with `Cmd/Ctrl+Shift+Space`
- **Streaming Responses** - See answers as they're generated
- **Conversation Memory** - Context maintained across messages
- **Dark/Light Theme** - Toggle with one click
- **Corner Snapping** - Snap to corners with keyboard shortcuts
- **Cross-Platform** - macOS, Windows, and Linux

## Quick Start

```bash
# Install dependencies
npm install

# Set your Zo access token (or set in-app)
export ZO_ACCESS_TOKEN="zo_sk_..."

# Run the app
npm start
```

## Hotkeys

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+Space` | Toggle overlay |
| `Cmd/Ctrl+Enter` | Submit message |
| `Cmd/Ctrl+Shift+Left` | Snap to bottom-left |
| `Cmd/Ctrl+Shift+Right` | Snap to top-right |
| `Esc` | Hide overlay |
| `Enter` | Send message |
| `Shift+Enter` | New line |

## Configuration

### Setting Your Token

**Option 1: Environment Variable**
```bash
export ZO_ACCESS_TOKEN="zo_sk_..."
```

**Option 2: In-App Settings**
- Click the gear icon in the overlay
- Enter your Zo access token
- Click "Save token"

## Development

```bash
# Run in development
npm run dev

# Build for macOS
npm run build:mac

# Build for Windows
npm run build:win

# Build for all platforms
npm run build:all
```

### Requirements

- Node.js 18+
- Electron 31+

## License

MIT
