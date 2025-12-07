import { PersonaId, DebateMessage } from './types';
import { PERSONAS, DEBATING_PERSONAS, selectNextSpeakers as selectSpeakers } from './personas';

export interface DebateContext {
  topic: string;
  messages: DebateMessage[];
  round: number;
}

export function buildPersonaPrompt(
  personaId: PersonaId,
  context: DebateContext
): { system: string; user: string } {
  const persona = PERSONAS[personaId];
  const otherPersonas = Object.values(PERSONAS)
    .filter((p) => p.id !== personaId && p.id !== 'judge')
    .map((p) => `${p.name} (${p.title})`)
    .join(', ');

  // Include ALL previous messages in the conversation
  const conversationHistory = context.messages
    .map((m) => {
      const p = PERSONAS[m.personaId];
      return `${p.name}: "${m.content}"`;
    })
    .join('\n\n');

  const system = `${persona.systemPrompt}

COUNCIL CONTEXT:
You are in a council debate with these other members: ${otherPersonas}

RULES:
1. Stay in character as ${persona.name}
2. Respond directly to what others have said - you can see the FULL conversation
3. You can agree, disagree, or build on points made by other council members
4. Reference other council members by name when responding to their points
5. Keep responses focused and impactful (2-4 sentences max)
6. Don't repeat points already made - add new perspectives
7. Be genuine and engage authentically with the topic
8. You are aware of everything said so far in the debate`;

  let user = `TOPIC FOR DEBATE: "${context.topic}"

ROUND ${context.round} OF THE DEBATE`;

  if (conversationHistory) {
    user += `

=== FULL CONVERSATION SO FAR ===
${conversationHistory}
=== END OF CONVERSATION ===

Now it's your turn, ${persona.name}. Respond to what has been said. You've heard everyone's arguments - engage with them directly!`;
  } else {
    user += `

You are starting this debate. Give your initial perspective on this topic as ${persona.name}. Set the tone for an engaging discussion.`;
  }

  return { system, user };
}

export function buildJudgePrompt(context: DebateContext): { system: string; user: string } {
  const judge = PERSONAS.judge;
  
  // Build a comprehensive summary of all arguments
  const conversationHistory = context.messages
    .map((m) => {
      const p = PERSONAS[m.personaId];
      return `${p.name}: "${m.content}"`;
    })
    .join('\n\n');

  // Group messages by persona for analysis
  const personaArguments = new Map<PersonaId, string[]>();
  context.messages.forEach((m) => {
    if (!personaArguments.has(m.personaId)) {
      personaArguments.set(m.personaId, []);
    }
    personaArguments.get(m.personaId)!.push(m.content);
  });

  let argumentSummary = '';
  personaArguments.forEach((args, personaId) => {
    const persona = PERSONAS[personaId];
    argumentSummary += `\n${persona.name}'s arguments:\n${args.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}\n`;
  });

  const system = `You are The Judge, the final arbiter of this debate. You are wise, fair, and decisive.

Your verdict MUST follow this exact structure:

1. **SUMMARY**: Briefly summarize the main positions (2-3 sentences)
2. **STRONGEST ARGUMENTS**: Identify the most compelling points made and by whom
3. **CONCERNS & WEAKNESSES**: Note any logical fallacies, weak points, or unanswered questions
4. **MY ANSWER TO THE QUESTION**: Directly answer "${context.topic}" with your own reasoned position
5. **FINAL VERDICT**: Declare which persona(s) made the strongest overall case and why

Be authoritative, balanced, and conclusive. Your verdict is final.`;

  const user = `DEBATE TOPIC: "${context.topic}"

The debate has concluded after ${context.round} round(s) with ${context.messages.length} total statements.

=== FULL DEBATE TRANSCRIPT ===
${conversationHistory}
=== END OF TRANSCRIPT ===

=== ARGUMENTS BY PARTICIPANT ===
${argumentSummary}
=== END OF SUMMARY ===

Now deliver your FINAL VERDICT. Remember to:
1. Summarize the key positions
2. Highlight the strongest arguments
3. Raise concerns and note weaknesses
4. ANSWER THE ORIGINAL QUESTION: "${context.topic}"
5. Declare your final ruling on who won the debate

Your verdict:`;

  return { system, user };
}

export function getInitialSpeakingOrder(): PersonaId[] {
  const shuffled = [...DEBATING_PERSONAS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}

export function getNextSpeakers(context: DebateContext): PersonaId[] {
  if (context.messages.length === 0) {
    return getInitialSpeakingOrder();
  }

  const historyForAnalysis = context.messages.map((m) => ({
    personaId: m.personaId,
    content: m.content,
  }));

  return selectSpeakers(historyForAnalysis, 3);
}

export function shouldContinueDebate(context: DebateContext): boolean {
  return context.messages.length < 20;
}

export function analyzeDebateDynamics(context: DebateContext): {
  dominantPersona: PersonaId | null;
  messageCountByPersona: Map<PersonaId, number>;
  suggestedNextSpeaker: PersonaId;
} {
  const messageCounts = new Map<PersonaId, number>();
  
  context.messages.forEach((m) => {
    if (m.personaId !== 'judge') {
      messageCounts.set(m.personaId, (messageCounts.get(m.personaId) || 0) + 1);
    }
  });

  let dominantPersona: PersonaId | null = null;
  let maxCount = 0;
  messageCounts.forEach((count, id) => {
    if (count > maxCount) {
      maxCount = count;
      dominantPersona = id;
    }
  });

  // Find the least active persona as suggested next speaker
  let suggestedNextSpeaker: PersonaId = DEBATING_PERSONAS[0];
  let minCount = Infinity;
  
  DEBATING_PERSONAS.forEach((id) => {
    const count = messageCounts.get(id) || 0;
    if (count < minCount) {
      minCount = count;
      suggestedNextSpeaker = id;
    }
  });

  return {
    dominantPersona,
    messageCountByPersona: messageCounts,
    suggestedNextSpeaker,
  };
}
