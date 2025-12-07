# 🎭 Council of Minds

An interactive AI debate arena where 7 unique AI personas with distinct personalities debate any topic you throw at them.

![Council of Minds](https://via.placeholder.com/800x400?text=Council+of+Minds)

## ✨ Features

- **7 Unique AI Personas**: Each with distinct personalities, speaking styles, and perspectives
  - 🟣 **The Sage** - Philosopher seeking deeper meaning
  - 🔴 **The Maverick** - Contrarian challenging assumptions
  - 🟢 **The Pragmatist** - Realist focused on practical outcomes
  - 🔵 **The Dreamer** - Visionary exploring possibilities
  - 🟡 **The Historian** - Scholar drawing from precedent
  - 🌸 **The Empath** - Humanist considering emotional impact
  - ⚪ **The Analyst** - Data-driven logician demanding evidence

- **Real-time Streaming Debates**: Watch the AI personas respond in real-time with smooth streaming
- **Interactive Voting**: React to statements with Agree, Interesting, or Disagree
- **Beautiful UI**: Dark theme with glowing personas and smooth animations
- **Gamification Ready**: Karma system, achievements, and more (expandable)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
cd council-of-minds
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create a .env.local file
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env.local
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **AI/LLM**: Vercel AI SDK with OpenAI GPT-4o-mini
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
│   ├── debate-orchestrator.ts # Persona prompt engineering
│   ├── personas.ts           # Persona definitions
│   ├── store.ts              # Zustand state store
│   └── types.ts              # TypeScript types
└── package.json
```

## 🎮 How It Works

1. **User submits a topic** - Any question, dilemma, or subject for debate
2. **Council is summoned** - The system selects 3-4 personas to respond each round
3. **Real-time streaming** - Each persona's response streams in real-time
4. **Interactive voting** - Users can vote on each statement
5. **Continuous debate** - Click "Continue" to hear more perspectives

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

### Changing the Model

Edit `app/api/debate/route.ts` to use a different model:

```typescript
const result = streamText({
  model: openai('gpt-4o'), // or 'gpt-4-turbo', 'gpt-3.5-turbo'
  // ...
});
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

