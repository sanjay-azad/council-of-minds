'use client';

import { motion } from 'framer-motion';
import { Trophy, Star } from 'lucide-react';
import { useKarmaStore, getKarmaLevel } from '@/lib/karma-store';

export function KarmaDisplay() {
  const { karma, totalDebates, totalVotes } = useKarmaStore();
  
  const { level, title, nextLevel } = getKarmaLevel(karma);
  const progress = nextLevel === Infinity ? 100 : (karma / nextLevel) * 100;

  return (
    <div className="relative">
      <motion.div
        className="flex items-center gap-3 px-4 py-2 rounded-xl bg-chamber-accent/50 border border-chamber-border hover:border-yellow-500/30 transition-colors cursor-pointer group"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <motion.span 
            className="font-bold text-yellow-500"
            key={karma}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {karma}
          </motion.span>
          <span className="text-gray-500 text-sm">karma</span>
        </div>
        
        {/* Level indicator */}
        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-chamber-border">
          <Star className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-400">Lv.{level}</span>
        </div>
        
        {/* Tooltip on hover */}
        <div className="absolute top-full right-0 mt-2 p-4 rounded-xl bg-chamber-dark border border-chamber-border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 min-w-[200px]">
          <div className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Level {level}</span>
              <span className="text-purple-400 font-medium">{title}</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-2 bg-chamber-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-yellow-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            
            {nextLevel !== Infinity && (
              <p className="text-xs text-gray-500">
                {nextLevel - karma} karma to next level
              </p>
            )}
            
            <div className="pt-2 border-t border-chamber-border space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Debates started</span>
                <span className="text-gray-300">{totalDebates}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Votes cast</span>
                <span className="text-gray-300">{totalVotes}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
