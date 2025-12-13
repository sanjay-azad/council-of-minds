'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, RotateCcw, Gavel, FastForward } from 'lucide-react';
import { useDebateStore } from '@/lib/store';
import { useDebate } from '@/hooks/useDebate';
import { PERSONAS, DEBATING_PERSONAS } from '@/lib/personas';
import { DebateMessage, TypingIndicator } from './DebateMessage';
import { Stance } from '@/lib/types';
import clsx from 'clsx';

interface CouncilChamberProps {
  onContinueDebate?: () => void;
  onTriggerJudge?: () => void;
}

function StanceMeter({ stances }: { stances: Record<string, { stance: Stance }> }) {
  let forCount = 0;
  let againstCount = 0;
  let undecidedCount = 0;
  
  Object.values(stances).forEach(({ stance }) => {
    if (stance === 'for') forCount++;
    else if (stance === 'against') againstCount++;
    else undecidedCount++;
  });
  
  const total = forCount + againstCount + undecidedCount;
  if (total === 0) return null;
  
  const forPercent = (forCount / total) * 100;
  const againstPercent = (againstCount / total) * 100;
  
  return (
    <div className="mb-6 p-4 rounded-xl bg-chamber-accent/30 border border-chamber-border">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-green-400 font-medium">FOR ({forCount})</span>
        <span className="text-gray-400">vs</span>
        <span className="text-red-400 font-medium">AGAINST ({againstCount})</span>
      </div>
      <div className="h-3 rounded-full bg-gray-800 overflow-hidden flex">
        <div 
          className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
          style={{ width: `${forPercent}%` }}
        />
        <div 
          className="h-full bg-gray-600"
          style={{ width: `${100 - forPercent - againstPercent}%` }}
        />
        <div 
          className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
          style={{ width: `${againstPercent}%` }}
        />
      </div>
      {undecidedCount > 0 && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          {undecidedCount} still undecided
        </p>
      )}
    </div>
  );
}

export function CouncilChamber({ onContinueDebate, onTriggerJudge }: CouncilChamberProps) {
  const {
    currentDebate,
    isDebating,
    activePersona,
    streamingContent,
    resumeDebate,
    reset,
  } = useDebateStore();

  // useDebate provides stopDebate which aborts streaming network requests
  const { stopDebate } = useDebate();

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const userScrolledRef = useRef(false);

  // Only auto-scroll when a new message is COMPLETED (not during streaming)
  useEffect(() => {
    if (autoScroll && !activePersona && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentDebate?.messages.length, autoScroll, activePersona]);

  // Handle user scroll - disable auto-scroll if user scrolls up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    
    if (!isAtBottom) {
      userScrolledRef.current = true;
      setAutoScroll(false);
    } else if (userScrolledRef.current) {
      // User scrolled back to bottom, re-enable auto-scroll
      userScrolledRef.current = false;
      setAutoScroll(true);
    }
  }, []);

  if (!currentDebate) return null;

  const hasVerdict = currentDebate.messages.some(m => m.isVerdict);
  const canGetVerdict = currentDebate.messages.length >= 3 && !hasVerdict && currentDebate.status !== 'judging';

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto p-4">
      {/* Council Members Sidebar */}
      <motion.div
        className="lg:w-64 flex-shrink-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-display font-bold text-gray-300 mb-4 px-2">
          The Council
        </h2>
        
        {/* Stance Meter */}
        {currentDebate.stances && (
          <StanceMeter stances={currentDebate.stances} />
        )}
        
        <div className="grid grid-cols-4 lg:grid-cols-1 gap-2">
          {/* Debating Personas */}
          {DEBATING_PERSONAS.map((personaId) => {
            const persona = PERSONAS[personaId];
            const messageCount = currentDebate.messages.filter(
              (m) => m.personaId === personaId
            ).length;
            const isActive = activePersona === personaId;

            return (
              <motion.div
                key={personaId}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl transition-all duration-300',
                  'border',
                  isActive
                    ? 'bg-chamber-accent border-opacity-100'
                    : 'bg-chamber-accent/30 border-chamber-border border-opacity-50'
                )}
                style={{
                  borderColor: isActive ? persona.color : undefined,
                }}
                whileHover={{ scale: 1.02 }}
              >
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center text-xl',
                    'border-2 transition-all duration-300'
                  )}
                  style={{
                    borderColor: persona.color,
                    backgroundColor: `${persona.color}15`,
                    boxShadow: isActive ? `0 0 20px ${persona.color}40` : 'none',
                  }}
                >
                  {persona.avatar}
                </div>
                <div className="hidden lg:block flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: persona.color }}
                  >
                    {persona.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {messageCount} message{messageCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </motion.div>
            );
          })}
          
          {/* The Judge */}
          <motion.div
            className={clsx(
              'flex items-center gap-3 p-3 rounded-xl transition-all duration-300',
              'border-2 border-dashed',
              activePersona === 'judge'
                ? 'bg-yellow-500/10 border-yellow-500'
                : hasVerdict
                ? 'bg-yellow-500/5 border-yellow-500/50'
                : 'bg-chamber-accent/20 border-chamber-border/50'
            )}
            whileHover={{ scale: 1.02 }}
          >
            <div
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-xl',
                'border-2 transition-all duration-300'
              )}
              style={{
                borderColor: '#fbbf24',
                backgroundColor: activePersona === 'judge' ? '#fbbf2430' : '#fbbf2410',
                boxShadow: activePersona === 'judge' ? '0 0 20px #fbbf2440' : 'none',
              }}
            >
              ⚖️
            </div>
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-yellow-500">
                The Judge
              </p>
              <p className="text-xs text-gray-500">
                {hasVerdict ? 'Verdict delivered' : 'Awaiting verdict'}
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Debate Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topic Header */}
        <motion.div
          className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm text-purple-400 mb-2">Current Topic</p>
          <h1 className="text-2xl font-display font-bold text-white">
            {currentDebate.topic}
          </h1>
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
              Round {currentDebate.round}
            </span>
            <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">
              {currentDebate.spokenThisRound?.length || 0}/6 spoken
            </span>
            <span className="text-sm text-gray-400">
              {currentDebate.messages.filter(m => !m.isVerdict).length} total arguments
            </span>
            <span
              className={clsx(
                'px-2 py-1 rounded-full text-xs font-medium',
                currentDebate.status === 'active' && 'bg-green-500/20 text-green-400',
                currentDebate.status === 'paused' && 'bg-yellow-500/20 text-yellow-400',
                currentDebate.status === 'judging' && 'bg-yellow-500/20 text-yellow-400 animate-pulse',
                currentDebate.status === 'completed' && 'bg-gray-500/20 text-gray-400'
              )}
            >
              {currentDebate.status === 'judging' ? '⚖️ Judge deliberating...' : 
               currentDebate.status.charAt(0).toUpperCase() + currentDebate.status.slice(1)}
            </span>
          </div>
        </motion.div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2"
        >
          <AnimatePresence mode="popLayout">
            {currentDebate.messages.map((message) => (
              <DebateMessage key={message.id} message={message} />
            ))}
          </AnimatePresence>

          {/* Streaming message */}
          {activePersona && streamingContent && (
            <DebateMessage
              message={{
                id: 'streaming',
                personaId: activePersona,
                content: streamingContent,
                timestamp: Date.now(),
                votes: { agree: 0, interesting: 0, disagree: 0 },
                isVerdict: activePersona === 'judge',
              }}
              isStreaming={true}
              streamingContent={streamingContent}
            />
          )}

          {/* Typing indicator */}
          {activePersona && !streamingContent && (
            <TypingIndicator personaId={activePersona} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Control Buttons */}
        <motion.div
          className="flex items-center justify-center gap-3 p-4 rounded-xl bg-chamber-accent/50 border border-chamber-border flex-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {currentDebate.status !== 'completed' && !hasVerdict && (
            <>
              {isDebating ? (
                <ControlButton
                  icon={Pause}
                  label="Pause"
                  // call stopDebate which aborts the streaming fetch and then sets paused state
                  onClick={() => {
                    stopDebate();
                  }}
                  color="#f59e0b"
                />
              ) : (
                <ControlButton
                  icon={FastForward}
                  label="Continue Debate"
                  onClick={() => {
                    // resumeDebate toggles status back to active; trigger continuation optionally
                    resumeDebate();
                    onContinueDebate?.();
                  }}
                  color="#10b981"
                  primary
                />
              )}
              
              {canGetVerdict && (
                <ControlButton
                  icon={Gavel}
                  label="Get Verdict"
                  onClick={onTriggerJudge}
                  color="#fbbf24"
                  primary
                />
              )}
            </>
          )}
          
          <ControlButton
            icon={RotateCcw}
            label="New Topic"
            onClick={reset}
            color="#8b5cf6"
          />
        </motion.div>
      </div>
    </div>
  );
}

interface ControlButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  color: string;
  primary?: boolean;
}

function ControlButton({ icon: Icon, label, onClick, color, primary }: ControlButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
        primary ? 'border-2' : 'border'
      )}
      style={{
        borderColor: primary ? color : `${color}50`,
        color: color,
        backgroundColor: primary ? `${color}15` : 'transparent',
      }}
      whileHover={{
        scale: 1.05,
        backgroundColor: `${color}25`,
      }}
      whileTap={{ scale: 0.95 }}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </motion.button>
  );
}
