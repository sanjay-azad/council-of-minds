'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Shuffle } from 'lucide-react';
import clsx from 'clsx';

interface TopicInputProps {
  onSubmit: (topic: string) => void;
  isDisabled?: boolean;
}

const SAMPLE_TOPICS = [
  "Should AI be granted legal rights?",
  "Is social media making us more lonely or more connected?",
  "Would you rather have the power to read minds or be invisible?",
  "Should we colonize Mars or fix Earth first?",
  "Is it ethical to eat meat?",
  "Does free will exist or are we all just responding to stimuli?",
  "Should college education be free?",
  "Is it better to be loved or respected?",
  "Would you take a pill that makes you perfectly happy forever?",
  "Should we fear or embrace artificial general intelligence?",
];

export function TopicInput({ onSubmit, isDisabled = false }: TopicInputProps) {
  const [topic, setTopic] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !isDisabled) {
      onSubmit(topic.trim());
      setTopic('');
    }
  };

  const handleRandomTopic = () => {
    const randomTopic = SAMPLE_TOPICS[Math.floor(Math.random() * SAMPLE_TOPICS.length)];
    setTopic(randomTopic);
  };

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={clsx(
            'relative rounded-2xl overflow-hidden transition-all duration-300',
            'border-2',
            isFocused
              ? 'border-purple-500/50 shadow-lg shadow-purple-500/10'
              : 'border-chamber-border'
          )}
        >
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter a topic, question, or dilemma for the council to debate..."
            disabled={isDisabled}
            rows={3}
            className={clsx(
              'w-full px-5 py-4 pr-28 bg-chamber-accent/50 text-white',
              'placeholder-gray-500 resize-none',
              'focus:outline-none',
              'font-body text-lg',
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <motion.button
              type="button"
              onClick={handleRandomTopic}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                'bg-chamber-glow/50 hover:bg-chamber-glow text-gray-400 hover:text-white',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isDisabled}
              title="Random topic"
            >
              <Shuffle className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              type="submit"
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-all duration-200',
                'flex items-center gap-2',
                topic.trim() && !isDisabled
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-chamber-glow text-gray-500 cursor-not-allowed'
              )}
              whileHover={topic.trim() && !isDisabled ? { scale: 1.02 } : {}}
              whileTap={topic.trim() && !isDisabled ? { scale: 0.98 } : {}}
              disabled={!topic.trim() || isDisabled}
            >
              <Send className="w-4 h-4" />
              <span>Summon Council</span>
            </motion.button>
          </div>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
        <Sparkles className="w-4 h-4" />
        <span>The council will debate your topic from multiple perspectives</span>
      </div>
    </motion.div>
  );
}

