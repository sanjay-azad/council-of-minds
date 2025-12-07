'use client';

import { motion } from 'framer-motion';
import { Persona } from '@/lib/types';
import clsx from 'clsx';

interface PersonaAvatarProps {
  persona: Persona;
  isActive?: boolean;
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function PersonaAvatar({
  persona,
  isActive = false,
  isSpeaking = false,
  size = 'md',
  onClick,
}: PersonaAvatarProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
  };

  return (
    <motion.button
      onClick={onClick}
      className={clsx(
        'relative rounded-full flex items-center justify-center',
        'border-2 transition-all duration-300',
        'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-chamber-dark',
        sizeClasses[size],
        isActive && 'ring-4 ring-opacity-50',
        onClick && 'cursor-pointer',
        !onClick && 'cursor-default'
      )}
      style={{
        borderColor: persona.color,
        backgroundColor: `${persona.color}15`,
        boxShadow: isActive ? `0 0 30px ${persona.color}40` : 'none',
        // @ts-expect-error CSS custom property
        '--tw-ring-color': persona.color,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={isSpeaking ? {
        boxShadow: [
          `0 0 20px ${persona.color}40`,
          `0 0 40px ${persona.color}60`,
          `0 0 20px ${persona.color}40`,
        ],
      } : {}}
      transition={isSpeaking ? {
        repeat: Infinity,
        duration: 1.5,
      } : {}}
    >
      <span className="select-none">{persona.avatar}</span>
      
      {isSpeaking && (
        <motion.div
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: persona.color }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 0, 0.8],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
          }}
        />
      )}
    </motion.button>
  );
}

export function PersonaCard({
  persona,
  isActive = false,
  isSpeaking = false,
  showDetails = true,
}: PersonaAvatarProps & { showDetails?: boolean }) {
  return (
    <motion.div
      className={clsx(
        'flex flex-col items-center gap-2 p-4 rounded-xl',
        'bg-chamber-accent/50 border border-chamber-border',
        'transition-all duration-300',
        isActive && 'border-opacity-100',
        !isActive && 'border-opacity-50 opacity-70'
      )}
      style={{
        borderColor: isActive ? persona.color : undefined,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PersonaAvatar
        persona={persona}
        isActive={isActive}
        isSpeaking={isSpeaking}
        size="lg"
      />
      
      {showDetails && (
        <>
          <h3
            className="font-display text-lg font-semibold"
            style={{ color: persona.color }}
          >
            {persona.name}
          </h3>
          <p className="text-xs text-gray-400 text-center">
            {persona.title}
          </p>
        </>
      )}
    </motion.div>
  );
}

