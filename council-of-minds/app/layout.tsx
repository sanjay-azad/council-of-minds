import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Council of Minds | AI Debate Arena',
  description: 'Watch AI personas with distinct personalities debate any topic. An interactive, gamified decision-making experience.',
  keywords: ['AI', 'debate', 'LLM', 'council', 'decision making', 'gamification'],
};

function Particles() {
  return (
    <div className="particles">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 20}s`,
            animationDuration: `${15 + Math.random() * 20}s`,
            opacity: 0.2 + Math.random() * 0.3,
          }}
        />
      ))}
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased chamber-bg min-h-screen">
        <Particles />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}

