import { PersonaId, DebateMessage, Stance, PersonaStance } from './types';
import { PERSONAS, DEBATING_PERSONAS } from './personas';

export interface DebateContext {
  topic: string;
  messages: DebateMessage[];
  round: number;
  stances?: Partial<Record<PersonaId, PersonaStance>>;
  spokenThisRound?: PersonaId[];
}

function formatStances(stances: Partial<Record<PersonaId, PersonaStance>> | undefined): string {
  if (!stances) return '';
  
  const stanceList: string[] = [];
  Object.values(stances).forEach((stanceInfo) => {
    if (!stanceInfo || stanceInfo.personaId === 'judge') return;
    const persona = PERSONAS[stanceInfo.personaId];
    let stanceStr = `${persona.name}: ${stanceInfo.stance.toUpperCase()}`;
    if (stanceInfo.changedFrom) {
      stanceStr += ` (changed from ${stanceInfo.changedFrom})`;
    }
    stanceList.push(stanceStr);
  });
  
  return stanceList.join('\n');
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

  // Get current stance for this persona
  const currentStance = context.stances?.[personaId]?.stance || 'undecided';
  const previousStanceChange = context.stances?.[personaId]?.changedFrom;

  // Include ALL previous messages in the conversation
  const conversationHistory = context.messages
    .map((m) => {
      const p = PERSONAS[m.personaId];
      const stanceIndicator = m.stance ? ` [${m.stance.toUpperCase()}]` : '';
      const changedIndicator = m.stanceChanged ? ' 🔄 CHANGED POSITION' : '';
      return `${p.name}${stanceIndicator}${changedIndicator}: "${m.content}"`;
    })
    .join('\n\n');

  const stancesSummary = formatStances(context.stances);

  const system = `${persona.systemPrompt}

COUNCIL CONTEXT:
You are in a council debate with these other members: ${otherPersonas}

STANCE RULES - VERY IMPORTANT:
1. You MUST pick a side: FOR or AGAINST on the topic (UNDECIDED is discouraged)
2. Start your response with your stance in brackets: [FOR] or [AGAINST]
3. If another persona makes a compelling argument, you CAN change your position
4. If you change your position, explicitly state "I've changed my mind" and explain why
5. Be intellectually honest - if someone makes a point you can't refute, acknowledge it

Your current stance: ${currentStance.toUpperCase()}
${previousStanceChange ? `(You previously changed from ${previousStanceChange.toUpperCase()})` : ''}

RESPONSE FORMAT:
[STANCE] Your argument...

Example: "[FOR] I believe this because..."
Example: "[AGAINST] I do not agree with the motion. The Analyst's point about... convinced me that..."
Say that I have changed my mind only when you change your stance from your previous reply.

RULES:
1. Stay in character as ${persona.name}
2. Respond directly to what others have said
3. Reference other council members by name
4. Keep responses focused (2-4 sentences max)
5. Don't repeat points already made
6. Be genuine and engage authentically`;

  let user = `TOPIC FOR DEBATE: "${context.topic}"

ROUND ${context.round} OF THE DEBATE

CURRENT STANCES:
${stancesSummary || 'No stances declared yet'}`;

  if (conversationHistory) {
    user += `

=== CONVERSATION SO FAR ===
${conversationHistory}
=== END OF CONVERSATION ===

Your turn, ${persona.name}. State your stance [FOR/AGAINST] and make your argument. If someone has convinced you to change your mind, say so explicitly!`;
  } else {
    user += `

You are starting this debate. State your initial stance [FOR/AGAINST] on this topic and explain why.`;
  }

  return { system, user };
}

export function buildJudgePrompt(context: DebateContext): { system: string; user: string } {
  const judge = PERSONAS.judge;
  
  const conversationHistory = context.messages
    .map((m) => {
      const p = PERSONAS[m.personaId];
      const stanceIndicator = m.stance ? ` [${m.stance.toUpperCase()}]` : '';
      const changedIndicator = m.stanceChanged ? ' 🔄 CHANGED POSITION' : '';
      return `${p.name}${stanceIndicator}${changedIndicator}: "${m.content}"`;
    })
    .join('\n\n');

  // Analyze stance changes
  const stanceChanges: string[] = [];
  const finalStances: { for: string[]; against: string[]; undecided: string[] } = {
    for: [],
    against: [],
    undecided: [],
  };

  if (context.stances) {
    Object.values(context.stances).forEach((stanceInfo) => {
      if (!stanceInfo || stanceInfo.personaId === 'judge') return;
      const persona = PERSONAS[stanceInfo.personaId];
      finalStances[stanceInfo.stance].push(persona.name);
      if (stanceInfo.changedFrom) {
        stanceChanges.push(`${persona.name} changed from ${stanceInfo.changedFrom.toUpperCase()} to ${stanceInfo.stance.toUpperCase()}`);
      }
    });
  }

  const stanceSummary = `
FOR the topic: ${finalStances.for.join(', ') || 'None'}
AGAINST the topic: ${finalStances.against.join(', ') || 'None'}
UNDECIDED: ${finalStances.undecided.join(', ') || 'None'}

Position Changes During Debate:
${stanceChanges.length > 0 ? stanceChanges.join('\n') : 'No one changed their position'}`;

  const system = `You are The Judge, the final arbiter of this debate. You are wise, fair, and decisive.

Your verdict MUST follow this structure:

1. **FINAL TALLY**: State how many personas ended up FOR vs AGAINST
2. **KEY ARGUMENTS**: The most compelling points from each side
3. **NOTABLE MOMENTS**: Highlight any position changes and what caused them
4. **CONCERNS & WEAKNESSES**: Logical issues or unanswered questions
5. **MY ANSWER**: Directly answer "${context.topic}" with your reasoned position
6. **VERDICT**: Declare which SIDE won the debate (not which persona, but FOR or AGAINST)

Be authoritative, balanced, and conclusive. Consider position changes as evidence of strong arguments.`;

  const user = `DEBATE TOPIC: "${context.topic}"

The debate concluded after ${context.round} round(s) with ${context.messages.length} statements.

=== STANCE SUMMARY ===${stanceSummary}
=== END OF STANCE SUMMARY ===

=== FULL DEBATE TRANSCRIPT ===
${conversationHistory}
=== END OF TRANSCRIPT ===

Deliver your FINAL VERDICT. Remember:
1. Count the final positions (FOR vs AGAINST)
2. Highlight the strongest arguments from each side
3. Note who changed their mind and why (this matters!)
4. Answer the question: "${context.topic}"
5. Declare which SIDE won overall

Your verdict:`;

  return { system, user };
}

// Parse stance from message content
export function parseStanceFromMessage(content: string): { stance: Stance; stanceChanged: boolean } {
  const upperContent = content.toUpperCase();
  
  // Check for stance indicator at the start
  let stance: Stance = 'undecided';
  if (upperContent.startsWith('[FOR]') || upperContent.includes('[FOR]')) {
    stance = 'for';
  } else if (upperContent.startsWith('[AGAINST]') || upperContent.includes('[AGAINST]')) {
    stance = 'against';
  } else if (upperContent.startsWith('[UNDECIDED]') || upperContent.includes('[UNDECIDED]')) {
    stance = 'undecided';
  }
  
  // Check if they mention changing their mind
  const changeIndicators = [
    "i've changed my mind",
    "i have changed my mind",
    "i'm changing my position",
    "i must reconsider",
    "convinced me",
    "i now believe",
    "i've reconsidered",
    "changing my stance",
    "i stand corrected",
    "you've convinced me",
    "compelling point",
    "i must admit",
    "i concede",
  ];
  
  const lowerContent = content.toLowerCase();
  const stanceChanged = changeIndicators.some(indicator => lowerContent.includes(indicator));
  
  return { stance, stanceChanged };
}

// Get speakers who haven't spoken this round
export function getNextSpeakers(context: DebateContext, count: number = 3): PersonaId[] {
  const spokenThisRound = context.spokenThisRound || [];
  
  // Find who hasn't spoken yet this round
  const notSpokenYet = DEBATING_PERSONAS.filter(id => !spokenThisRound.includes(id));
  
  if (notSpokenYet.length === 0) {
    // Everyone has spoken - this shouldn't happen if we manage rounds properly
    // But as fallback, shuffle all and return first 3
    const shuffled = shuffleArray([...DEBATING_PERSONAS]);
    return shuffled.slice(0, count);
  }
  
  // Shuffle the ones who haven't spoken and return up to 'count'
  const shuffled = shuffleArray([...notSpokenYet]);
  return shuffled.slice(0, Math.min(count, notSpokenYet.length));
}

// Helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if all personas have spoken this round
export function allHaveSpoken(spokenThisRound: PersonaId[]): boolean {
  return DEBATING_PERSONAS.every(id => spokenThisRound.includes(id));
}

// Get count of remaining speakers this round
export function getRemainingCount(spokenThisRound: PersonaId[]): number {
  return DEBATING_PERSONAS.filter(id => !spokenThisRound.includes(id)).length;
}

export function shouldContinueDebate(context: DebateContext): boolean {
  return context.messages.length < 30; // Allow up to 5 full rounds
}

export function analyzeDebateDynamics(context: DebateContext): {
  dominantPersona: PersonaId | null;
  messageCountByPersona: Map<PersonaId, number>;
  suggestedNextSpeaker: PersonaId;
  stanceCounts: { for: number; against: number; undecided: number };
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

  let suggestedNextSpeaker: PersonaId = DEBATING_PERSONAS[0];
  let minCount = Infinity;
  
  DEBATING_PERSONAS.forEach((id) => {
    const count = messageCounts.get(id) || 0;
    if (count < minCount) {
      minCount = count;
      suggestedNextSpeaker = id;
    }
  });

  // Count stances
  const stanceCounts = { for: 0, against: 0, undecided: 0 };
  if (context.stances) {
    Object.values(context.stances).forEach((stanceInfo) => {
      if (stanceInfo) {
        stanceCounts[stanceInfo.stance]++;
      }
    });
  }

  return {
    dominantPersona,
    messageCountByPersona: messageCounts,
    suggestedNextSpeaker,
    stanceCounts,
  };
}
