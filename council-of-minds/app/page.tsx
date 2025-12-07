'use client';

import { motion } from 'framer-motion';
import { Crown, Users, Zap, Gavel } from 'lucide-react';
import { TopicInput } from '@/components/TopicInput';
import { CouncilChamber } from '@/components/CouncilChamber';
import { KarmaDisplay } from '@/components/KarmaDisplay';
import { useDebate } from '@/hooks/useDebate';
import { useDebateStore } from '@/lib/store';
import { PERSONAS, DEBATING_PERSONAS } from '@/lib/personas';

export default function Home() {
  const { initiateDebate, continueDebate, triggerJudge } = useDebate();
  const { currentDebate, isDebating } = useDebateStore();

  const handleSubmitTopic = async (topic: string) => {
    await initiateDebate(topic);
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="py-6 px-4 border-b border-chamber-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold gradient-text">
                Council of Minds
              </h1>
              <p className="text-xs text-gray-500">AI Debate Arena</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <KarmaDisplay />
          </motion.div>
        </div>
      </header>

      {!currentDebate ? (
        /* Landing / Topic Input View */
        <div className="py-16 px-4">
          {/* Hero Section */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h2
              className="font-display text-5xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span className="gradient-text">Summon the Council</span>
            </motion.h2>
            <motion.p
              className="text-xl text-gray-400 max-w-2xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Watch 6 unique AI personas debate any topic, then let The Judge deliver the final verdict.
            </motion.p>

            {/* Features */}
            <motion.div
              className="flex flex-wrap justify-center gap-6 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <FeatureBadge icon={Users} text="6 Debaters" />
              <FeatureBadge icon={Zap} text="Real-time Debates" />
              <FeatureBadge icon={Gavel} text="Final Verdict" color="text-yellow-500" />
            </motion.div>
          </motion.div>

          {/* Topic Input */}
          <TopicInput onSubmit={handleSubmitTopic} isDisabled={isDebating} />

          {/* Persona Preview */}
          <motion.div
            className="mt-20 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h3 className="text-center text-lg text-gray-400 mb-8">
              Meet the Council
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {/* Debating Personas */}
              {DEBATING_PERSONAS.map((personaId, index) => {
                const persona = PERSONAS[personaId];
                return (
                  <motion.div
                    key={personaId}
                    className="flex flex-col items-center p-4 rounded-xl bg-chamber-accent/30 border border-chamber-border hover:border-opacity-100 transition-all duration-300 group"
                    style={{ borderColor: `${persona.color}30` }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    whileHover={{
                      scale: 1.05,
                      borderColor: persona.color,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 mb-3 transition-all duration-300 group-hover:shadow-lg"
                      style={{
                        borderColor: persona.color,
                        backgroundColor: `${persona.color}15`,
                      }}
                    >
                      {persona.avatar}
                    </div>
                    <span
                      className="text-sm font-medium text-center"
                      style={{ color: persona.color }}
                    >
                      {persona.name.replace('The ', '')}
                    </span>
                    <span className="text-xs text-gray-500 text-center mt-1">
                      {persona.speakingStyle[0]}
                    </span>
                  </motion.div>
                );
              })}
              
              {/* The Judge - Special Card */}
              <motion.div
                className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-yellow-900/20 to-amber-900/10 border-2 border-dashed border-yellow-500/50 hover:border-yellow-500 transition-all duration-300 group col-span-2 sm:col-span-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-yellow-500 bg-yellow-500/20 mb-3">
                  ⚖️
                </div>
                <span className="text-sm font-medium text-center text-yellow-500">
                  The Judge
                </span>
                <span className="text-xs text-yellow-600/70 text-center mt-1">
                  Final Verdict
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Karma Info */}
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <p className="text-sm text-gray-500">
              💡 Earn karma by starting debates (+10), voting (+1), and getting verdicts (+15)
            </p>
          </motion.div>

          {/* Sample Topics */}
          <motion.div
            className="mt-12 max-w-3xl mx-auto text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <h3 className="text-lg text-gray-400 mb-6">Popular Topics</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                'Is AI consciousness possible?',
                'Should we have a 4-day work week?',
                'Is social media harmful?',
                'Does money buy happiness?',
                'Should voting be mandatory?',
              ].map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleSubmitTopic(topic)}
                  className="px-4 py-2 rounded-full text-sm bg-chamber-accent/50 border border-chamber-border hover:border-purple-500/50 text-gray-300 hover:text-white transition-all duration-200"
                >
                  {topic}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      ) : (
        /* Debate View */
        <div className="py-6">
          <CouncilChamber 
            onContinueDebate={continueDebate} 
            onTriggerJudge={triggerJudge}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 mt-12 border-t border-chamber-border/30">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>Council of Minds • Powered by AI • Built for curious minds</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureBadge({ icon: Icon, text, color }: { icon: React.ComponentType<{ className?: string }>; text: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-chamber-accent/50 border border-chamber-border">
      <Icon className={`w-4 h-4 ${color || 'text-purple-400'}`} />
      <span className="text-sm text-gray-300">{text}</span>
    </div>
  );
}
