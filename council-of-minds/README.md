# 🎭 Council of Minds

An interactive AI debate arena where 6 unique AI personas debate any topic, then The Judge delivers a final verdict.

## ✨ Features

- **6 Debaters + The Judge**: Distinct personalities with FOR/AGAINST stances
  - 🟣 **The Sage** - Philosopher seeking deeper meaning
  - 🔴 **The Maverick** - Contrarian challenging assumptions
  - 🟢 **The Pragmatist** - Realist focused on practical outcomes
  - 🟡 **The Historian** - Scholar drawing from precedent
  - 🌸 **The Empath** - Humanist considering emotional impact
  - ⚪ **The Analyst** - Data-driven logician demanding evidence
  - ⚖️ **The Judge** - Delivers the final structured verdict

- **Switchable LLM providers**: OpenAI or Google Gemini via environment config
- **Real-time Streaming Debates**: Watch personas respond with smooth SSE streaming
- **Interactive Voting**: React with Agree, Interesting, or Disagree
- **Karma System**: Earn points for starting debates, voting, and verdicts

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key and/or Google Gemini API key

### Installation

1. Navigate to the app directory:
```bash
cd council-of-minds
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### LLM Provider Configuration

Set `LLM_PROVIDER` in `.env.local`:

```bash
# Use OpenAI (default)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Or use Google Gemini
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
```

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **AI/LLM**: Vercel AI SDK (`ai`) with OpenAI and Google Gemini providers
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Language**: TypeScript

## 📁 Project Structure

```
council-of-minds/
├── app/
│   ├── api/
│   │   └── debate/
│   │       └── route.ts      # Streaming debate API
│   ├── globals.css           # Global styles & animations
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page
├── components/
│   ├── CouncilChamber.tsx    # Main debate view
│   ├── DebateMessage.tsx     # Message component with voting
│   ├── PersonaAvatar.tsx     # Persona avatar & card
│   └── TopicInput.tsx        # Topic submission form
├── hooks/
│   └── useDebate.ts          # Debate orchestration hook
├── lib/
│   ├── llm/                  # Provider abstraction (OpenAI + Gemini)
│   ├── debate-orchestrator.ts
│   ├── personas.ts
│   ├── store.ts
│   ├── karma-store.ts
│   ├── constants.ts
│   └── types.ts
├── .env.example
└── package.json
```

## 🎮 How It Works

1. **User submits a topic** — any question or dilemma
2. **Council debates in batches** — 3 personas speak, then auto-pause for user control
3. **Real-time streaming** — each response streams via SSE
4. **Interactive voting** — vote on each statement
5. **Continue or verdict** — resume debate (up to 5 rounds) or call The Judge

### Persona Agent System

Each persona is powered by a carefully crafted system prompt that defines:
- **Personality traits** - Core characteristics and values
- **Speaking style** - How they communicate
- **Debate behavior** - How they interact with others
- **Temperature setting** - Controls creativity vs consistency

The debate orchestrator intelligently selects which personas speak next based on:
- Who was mentioned or challenged
- Who has been quiet
- Natural conversation flow

## 🎨 Customization

### Adding New Personas

Edit `lib/personas.ts` to add new personas:

```typescript
export const PERSONAS: Record<PersonaId, Persona> = {
  // ... existing personas
  
  newpersona: {
    id: 'newpersona',
    name: 'The Innovator',
    title: 'Tech Futurist',
    avatar: '🚀',
    color: '#00ff88',
    // ... rest of persona definition
  }
};
```

### Changing the Model or Provider

Edit `.env.local`:

```bash
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.0-flash
```

Or for OpenAI:

```bash
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4o
```

## 📈 Future Roadmap

- [ ] User authentication & profiles
- [ ] Achievement system
- [ ] Custom persona creation
- [ ] Debate history & archives
- [ ] Multiplayer debates
- [ ] Voice mode (text-to-speech)
- [ ] Mobile app

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for any purpose.

---

Built with ❤️ for curious minds who love exploring ideas from multiple perspectives.

