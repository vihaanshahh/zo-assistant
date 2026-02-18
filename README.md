# Stealth Wingman

> Invisible Desktop AI Assistant with Memory and Specialized AI Modes

A privacy-focused AI assistant that stays hidden during screen shares and video calls, featuring memory recall and specialized AI modes for search and deep thinking.

## Features

- **Specialized AI Modes** - Search mode (Perplexity) and Think mode (DeepSeek R1) with one click
- **Memory System** - Save and recall screenshots with AI-generated descriptions
- **Smart Tagging** - Organize memories by topic, job, or custom tags
- **Semantic Search** - AI-powered search using embeddings
- **Visual Browser** - Intuitive UI to browse and manage memories
- **Multiple AI Backends** - OpenRouter, OpenAI, Ollama, and Gemini support
- **Invisible Mode** - Hidden from screen recording and video calls
- **Global Hotkeys** - Quick access without leaving your workflow
- **Privacy First** - All data stored locally, no cloud sync

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Set up API keys (optional - can also set in app)
export OPENROUTER_API_KEY="sk-or-v1-..."
export OPENAI_API_KEY="sk-proj-..."

# Run the app
npm start
```

### First Steps

1. **Toggle Overlay**: Press `Ctrl/Cmd+Shift+Space`
2. **Get Help**: Type `/help` to see all commands
3. **Try AI Modes**: Click Search (web search) or Think (deep reasoning) buttons
4. **Capture Screenshot**: Press `Ctrl/Cmd+H`
5. **Save Memory**: Type `/ss base` to save with a tag
6. **Search Memories**: Type `/recall base` to find saved memories
7. **Browse Visually**: Type `/open` to open the memory browser

## Commands

### AI Modes (Button Toggles)

| Mode | Description | Model |
|------|-------------|-------|
| 🔍 Search | Web search with live information | Perplexity Sonar |
| 💭 Think | Deep reasoning and analysis | DeepSeek R1 |
| 💬 Chat | Standard conversation (default) | Your configured model |

### Memory Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/ss [tag]` | Save screenshot with tag | `/ss meeting`, `/ss job:interview` |
| `/recall [query]` | Search memories | `/recall meeting`, `/recall base` |
| `/open` | Open memory browser | `/open` |
| `/tags` | List all tags | `/tags` |

### AI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/model [name]` | Change AI model | `/model gpt-4o` |
| `/backend [name]` | Change AI backend | `/backend openai` |
| Chat (no /) | Talk to AI | `Explain this code` |

### Utility Commands

| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/clear confirm` | Delete all memories (permanent) |

## Hotkeys

- Toggle Overlay: `Ctrl/Cmd+Shift+Space`
- Submit/Run: `Ctrl/Cmd+Enter`
- Capture Screenshot: `Ctrl/Cmd+H`

## Use Cases

### 1. Research with Web Search
```
[Click Search mode button 🔍]
What are the latest AI developments in 2025?
# Uses Perplexity for real-time web search
```

### 2. Deep Problem Solving
```
[Click Think mode button 💭]
Design a scalable microservices architecture for...
# Uses DeepSeek R1 for detailed reasoning
```

### 3. Meeting Note-taking
```
[During meeting]
Ctrl/Cmd+H          # Capture whiteboard
/ss meeting         # Save with meeting tag

[Later]
/recall meeting     # Find all meeting notes
/open              # Browse visually
```

### 4. Interview Prep
```
[During coding interview]
Ctrl/Cmd+H          # Capture problem
/ss job:company1    # Save with job tag

[After]
/recall job:company1    # Review
Help me solve this algorithm problem  # Chat with AI
```

## Configuration

### AI Backends

The app supports multiple AI backends:

**OpenRouter** (Default)
- Access to 100+ models (Claude, GPT-4, Llama, etc.)
- Best for flexibility and model variety
- Requires: `OPENROUTER_API_KEY`

**OpenAI**
- Direct OpenAI API access
- GPT-4o with vision support
- Used for embeddings and semantic search
- Requires: `OPENAI_API_KEY`

**Ollama**
- Local models running on your machine
- Complete privacy, no API calls
- Requires: Local Ollama installation

**Gemini**
- Google's Gemini models
- Requires: `GEMINI_API_KEY`

### Setting API Keys

**Option 1: Environment Variables**
```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
export OPENAI_API_KEY="sk-proj-..."
```

**Option 2: In-App Settings**
- Click the settings button
- Edit the JSON configuration
- Keys are stored securely in app settings

### Default Settings

```javascript
{
  ai: {
    backend: 'openrouter',
    openRouterModel: 'anthropic/claude-3.5-sonnet',
    openAIModel: 'gpt-4o'
  },
  invisibilityMode: true,
  hotkeys: {
    toggleOverlay: 'CommandOrControl+Shift+Space',
    submit: 'CommandOrControl+Enter',
    screenshot: 'CommandOrControl+H'
  }
}
```

## File Locations

### macOS
- Settings: `~/Library/Application Support/stealth-wingman/config.json`
- Memories: `~/Library/Application Support/stealth-wingman/memories.json`

### Windows
- Settings: `%APPDATA%\stealth-wingman\config.json`
- Memories: `%APPDATA%\stealth-wingman\memories.json`

### Linux
- Settings: `~/.config/stealth-wingman/config.json`
- Memories: `~/.config/stealth-wingman/memories.json`

## Privacy & Security

✅ **Local Storage** - All data stored on your device
✅ **Content Protection** - Window hidden from screen recording
✅ **Ephemeral by Default** - Screenshots deleted unless saved
✅ **No Telemetry** - No tracking or analytics
✅ **Secure Keys** - API keys encrypted in system keychain
✅ **Open Source** - Full transparency, audit the code

## Development

### Project Structure

```
stealth-wingman/
├── main.js              # Electron main process
├── preload.cjs          # IPC bridge
├── src/
│   ├── ai/             # AI backend integrations (router, OpenRouter, OpenAI, Ollama, Gemini)
│   ├── memory/         # Memory storage system with spaces
│   ├── commands/       # Command parser & handlers
│   └── utils/          # Simple store for settings
└── renderer/
    ├── index.html      # Main overlay UI
    ├── renderer.js     # Overlay logic
    ├── main-app.html   # Main window UI
    ├── main-app.js     # Main window logic
    ├── browser.html    # Memory browser UI
    ├── browser.js      # Browser logic
    └── screenshot.js   # Screenshot capture utility
```

### Requirements

- Node.js 18+
- Electron 31+
- macOS, Windows, or Linux

## Troubleshooting

### Commands not working
- Ensure you're using `/` prefix for commands
- Type `/help` to verify available commands

### Screenshot not capturing
- Check screen recording permissions:
  - **macOS**: System Settings > Privacy & Security > Screen Recording
  - **Windows**: No permissions needed
  - **Linux**: Depends on display server

### AI not responding
- Verify API keys are set: `/backend` to check current backend
- Try switching backends: `/backend openai` or `/backend openrouter`
- Check internet connection

### Memory browser not opening
- Use `/open` command (not just "open")
- Check console for errors (F12 in overlay)

## License

MIT License

---

**Built with privacy in mind. Your data stays on your device.**
