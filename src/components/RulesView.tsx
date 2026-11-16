import React from 'react';

export const RulesView: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="pb-5 border-b border-amber-400/20 space-y-2">
        <h1
          className="text-3xl font-bold text-amber-50"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Competition Rules & Leagues Guide
        </h1>
        <p className="text-sm text-amber-100/80">
          Four dedicated human-vs-human leagues plus 5-level computer solo training, FIDE chess rules, and 3D/2D controls.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-[#241005]/95 border border-amber-400/25 space-y-3 shadow-xl">
          <h2 className="text-base font-bold text-amber-50">01. World Chess League (Human Only)</h2>
          <p className="text-sm text-amber-100/85 leading-relaxed">
            Up to 50 real entered players compete for a ₹50,000 prize pool distributed in a 3:2:1 ratio. Tiers: Normal (₹500), Hard (₹1,000), Hardcore (₹2,000), Expert (₹3,000).
          </p>
          <ul className="text-xs text-amber-200/80 space-y-1.5 pt-1 font-mono">
            <li>1st Place (Share 3/6): ₹25,000</li>
            <li>2nd Place (Share 2/6): ₹16,667</li>
            <li>3rd Place (Share 1/6): ₹8,333</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-[#241005]/95 border border-amber-400/25 space-y-3 shadow-xl">
          <h2 className="text-base font-bold text-amber-50">02. Moradabad School, College & Companies Leagues</h2>
          <p className="text-sm text-amber-100/85 leading-relaxed">
            Each Moradabad, Uttar Pradesh division runs separately. Management deposits ₹10,000 per School, College, or Company; students/employees enter for ₹0 and play real human entrants only — Top 3 win 3:2:1 cash prizes.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#241005]/95 border border-amber-400/25 space-y-3 shadow-xl">
          <h2 className="text-base font-bold text-amber-50">03. Normal Solo Play vs Computer (5 Levels)</h2>
          <p className="text-sm text-amber-100/85 leading-relaxed">
            In the Arena tab, train solo against 5 calibrated AI levels: Easy (950), Moderate (1250), Hard (1550), Hardcore (1850), and Expert (2200), or play 2P Pass & Play.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#241005]/95 border border-amber-400/25 space-y-3 shadow-xl">
          <h2 className="text-base font-bold text-amber-50">04. 3D/2D Board & Keyboard Shortcuts</h2>
          <p className="text-sm text-amber-100/85 leading-relaxed">
            Orbit the 3D Staunton board with drag/scroll, switch camera angles anytime, or toggle 2D Classic.
          </p>
          <ul className="text-xs text-amber-200/80 space-y-1.5 pt-1 font-mono">
            <li>F · Flip board orientation</li>
            <li>Left / Right Arrow · Step through move history</li>
            <li>Home / End · Jump to start or live position</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
