# Kimi AI Frontend

A complete single-file HTML/CSS/JS frontend that connects to the Kimi backend.

## 🚀 Quick Start

1. Open `index.html` in any modern browser (Chrome, Safari, Firefox, Edge).
2. That's it — no build step, no dependencies.

## ⚙️ Configuration

The defaults are pre-configured:

- **Backend URL:** `https://kimibg1.onrender.com`
- **Secret Token:** `SARFRAZco1@`

You can change both from **Drawer → Settings** any time. They are saved to `localStorage`.

## ✨ Features

| # | Feature | Endpoint |
|---|---------|----------|
| 1 | 💬 Chat (streaming + non-streaming) | `/api/chat`, `/api/chat/stream` |
| 2 | 🌐 Web Search | `/api/search` |
| 3 | 🎨 Image Generation | `/api/image/generate` |
| 4 | 🔊 TTS (Text-to-Speech) | `/api/tts` |
| 5 | 📁 File / Image / URL Upload | `/api/upload`, `/api/upload/image`, `/api/upload/url` |
| 6 | 🌐 Translation | `/api/translate` |
| 7 | 📝 Summarize (Text / URL / YouTube) | `/api/summarize/*` |
| 8 | 💻 Code Tools (Review / Fix / Explain / Convert / Generate) | `/api/code/*` |
| 9 | ✍️ Write Tools (Blog / Email / Social / Improve) | `/api/write/*` |
| 10 | 💬 Chat History (List / Load / Delete / Export) | `/api/history/*` |
| 11 | 📊 Live Status Panel + Feature Tester | `/api/status` + ping all |

## 📱 UI Highlights

- Kimi.com-style clean white UI with purple (#7c4dff) accent
- Mobile-first phone shell (max-width 480 px), works perfectly on Android
- Top bar: hamburger ▸ model selector ▸ voice ▸ plus
- Slide-in left drawer with profile, history, settings
- Bottom composer with scrollable quick-chip toolbar
- Floating status FAB (bottom-right) with pulsing green / red / yellow dot
- Bottom sheets for Status, Attach, Settings
- Dark mode toggle (auto-saved)
- Streaming SSE chat with blinking cursor
- Markdown rendering (bold, code, code blocks with copy button, lists, links)
- Toasts for errors (401 / 429 / timeout / offline)
- Auto-save messages + session_id to localStorage

## 🎨 Model Indicators

| Model | Color |
|-------|-------|
| Instant | 🔵 Blue |
| Thinking | 🟣 Purple |
| Agent | 🟠 Orange |
| Agent Swarm | 🟢 Green |

## 📊 Status Panel

- Auto-refreshes every 60 seconds
- Shows Backend / Uptime / API Keys / Requests / Errors
- "Test All Features" runs a ping against all 11 endpoints and shows ✅ / ❌ + response time per feature
- CSS-only bar chart of last 5 response times

## 💾 Local Storage Keys

```
kimi_session_id      → current session UUID
kimi_model           → selected model
kimi_messages        → current chat messages
kimi_theme           → light / dark
kimi_token           → secret token
kimi_base_url        → backend URL
kimi_streaming       → on / off
kimi_tts_auto        → on / off
```

## 🔐 Security

The secret token is stored only in your browser's `localStorage`. Never commit it to a public repo.

---

Built for **SARFRAZ** · Single file · Zero dependencies · Production-ready.
