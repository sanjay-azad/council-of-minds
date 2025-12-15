'use client';

import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { ThumbsUp, Sparkles, ThumbsDown, Gavel, RefreshCw, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DebateMessage as DebateMessageType, PersonaId, Stance } from '@/lib/types';
import { PERSONAS } from '@/lib/personas';
import { PersonaAvatar } from './PersonaAvatar';
import { useDebateStore } from '@/lib/store';
import clsx from 'clsx';

interface DebateMessageProps {
  message: DebateMessageType;
  isStreaming?: boolean;
  streamingContent?: string;
}

function StanceBadge({ stance, changed }: { stance?: Stance; changed?: boolean }) {
  if (!stance || stance === 'undecided') return null;
  
  const isFor = stance === 'for';
  
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase',
      isFor ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
    )}>
      {changed && <RefreshCw className="w-3 h-3" />}
      {stance}
    </span>
  );
}

export function DebateMessage({
  message,
  isStreaming = false,
  streamingContent,
}: DebateMessageProps) {
  const persona = PERSONAS[message.personaId];
  const { vote, userVotes } = useDebateStore();
  const userVote = userVotes[message.id];
  const content = isStreaming ? streamingContent : message.content;
  const isVerdict = message.isVerdict;

  // Remove [FOR] or [AGAINST] tags from the start of the message for display
  const displayContent = content?.replace(/^\s*\[(FOR|AGAINST)\]\s*/i, '');

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const handleShare = async () => {
    try {
      const textToShare = `${persona.name}: ${message.content}`;
      if (navigator.share) {
        await navigator.share({ title: 'Council of Minds — Quote', text: textToShare });
        setToast('Shared');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToShare);
        // simple feedback could be added (toast) — omitted for brevity
        setToast('Copied to clipboard');
      } else {
        // fallback: create temporary textarea
        const el = document.createElement('textarea');
        el.value = textToShare;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setToast('Copied to clipboard');
      }
    } catch (e) {
      console.error('Share failed', e);
      setToast('Share failed');
    }
  };

  // Special styling for Judge's verdict
  if (isVerdict) {
    return (
      <motion.div
        className="message-enter p-6 rounded-2xl bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border-2 border-yellow-500/50"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl border-2 border-yellow-500 bg-yellow-500/20">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-yellow-500" />
              <span className="font-display text-xl font-bold text-yellow-500">
                Final Verdict
              </span>
            </div>
            <p className="text-sm text-yellow-600/70">The Judge has spoken</p>
          </div>
        </div>

        <div className="pl-4 border-l-4 border-yellow-500/50">
          {/* Render verdict as sanitized HTML from Markdown */}
          <div
            className="text-gray-100 leading-relaxed text-lg"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(content || '')) }}
          />
          {isStreaming && (
            <motion.span
              className="inline-block w-2 h-5 ml-1 bg-yellow-500"
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
          )}
        </div>

        {!isStreaming && (
          <div className="mt-4 pt-4 border-t border-yellow-500/20 flex items-center justify-center gap-4">
            <span className="text-sm text-yellow-600/70">
              Debate concluded • {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={clsx(
        "message-enter flex gap-4 p-4 rounded-xl bg-chamber-accent/30 border hover:border-chamber-glow transition-colors",
        message.stanceChanged
          ? "border-purple-500/50 bg-purple-900/10"
          : "border-chamber-border"
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex-shrink-0">
        <PersonaAvatar
          persona={persona}
          isActive={true}
          isSpeaking={isStreaming}
          size="md"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="font-display font-semibold"
            style={{ color: persona.color }}
          >
            {persona.name}
          </span>
          <StanceBadge stance={message.stance} changed={message.stanceChanged} />
          {message.stanceChanged && (
            <span className="text-xs text-purple-400 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Changed position!
            </span>
          )}
          {isStreaming && (
            <span className="flex gap-1">
              <span className="typing-dot" style={{ backgroundColor: persona.color }} />
              <span className="typing-dot" style={{ backgroundColor: persona.color }} />
              <span className="typing-dot" style={{ backgroundColor: persona.color }} />
            </span>
          )}
        </div>
        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
          {displayContent}
          {isStreaming && (
            <motion.span
              className="inline-block w-2 h-4 ml-1 bg-current"
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
          )}
        </p>
        {!isStreaming && (
          <>
            <div className="flex items-center gap-4 mt-3">
              <VoteButton
                icon={ThumbsUp}
                count={message.votes.agree}
                isActive={userVote === 'agree'}
                color="#10b981"
                onClick={() => {
                  vote(message.id, 'agree');
                  setToast('Voted: Agree');
                }}
                label="Agree"
              />
              <VoteButton
                icon={Sparkles}
                count={message.votes.interesting}
                isActive={userVote === 'interesting'}
                color="#f59e0b"
                onClick={() => {
                  vote(message.id, 'interesting');
                  setToast('Voted: Interesting');
                }}
                label="Interesting"
              />
              <VoteButton
                icon={ThumbsDown}
                count={message.votes.disagree}
                isActive={userVote === 'disagree'}
                color="#ef4444"
                onClick={() => {
                  vote(message.id, 'disagree');
                  setToast('Voted: Disagree');
                }}
                label="Disagree"
              />
              <VoteButton
                icon={Share2}
                count={0}
                isActive={false}
                color="#7c3aed"
                onClick={handleShare}
                label="Share"
              />
            </div>
            {/* Toast */}
            {toast && (
              <div className="fixed left-1/2 transform -translate-x-1/2 bottom-8 z-50">
                <div className="bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg">
                  {toast}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

interface VoteButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  isActive: boolean;
  color: string;
  onClick: () => void;
  label: string;
}

function VoteButton({
  icon: Icon,
  count,
  isActive,
  color,
  onClick,
  label,
}: VoteButtonProps) {
  return (
    <motion.button
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
        'border transition-all duration-200',
        isActive
          ? 'border-opacity-100 bg-opacity-20'
          : 'border-chamber-border hover:border-opacity-70 bg-transparent'
      )}
      style={{
        borderColor: isActive ? color : undefined,
        backgroundColor: isActive ? `${color}20` : undefined,
        color: isActive ? color : '#9ca3af',
      }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={label}
    >
      <Icon className="w-4 h-4" />
      <span>{count}</span>
    </motion.button>
  );
}

export function TypingIndicator({ personaId }: { personaId: PersonaId }) {
  const persona = PERSONAS[personaId];
  const isJudge = personaId === 'judge';

  return (
    <motion.div
      className={clsx(
        'flex items-center gap-3 p-4 rounded-xl border',
        isJudge 
          ? 'bg-yellow-900/20 border-yellow-500/30' 
          : 'bg-chamber-accent/20 border-chamber-border'
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div
        className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center text-xl border-2',
          isJudge && 'animate-pulse'
        )}
        style={{
          borderColor: persona.color,
          backgroundColor: `${persona.color}15`,
        }}
      >
        {persona.avatar}
      </div>
      <div className="flex items-center gap-2">
        <span className={clsx('text-sm', isJudge ? 'text-yellow-400' : 'text-gray-400')}>
          {isJudge ? 'The Judge is deliberating' : `${persona.name} is thinking`}
        </span>
        <span className="flex gap-1">
          <span className="typing-dot" style={{ backgroundColor: persona.color }} />
          <span className="typing-dot" style={{ backgroundColor: persona.color }} />
          <span className="typing-dot" style={{ backgroundColor: persona.color }} />
        </span>
      </div>
    </motion.div>
  );
}
