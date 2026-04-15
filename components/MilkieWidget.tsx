'use client';

import { useEffect, useRef, useState } from 'react';

export type CowMood = 'empty' | 'half' | 'full' | 'payday';

interface MilkieWidgetProps {
  /** 0..1 fill level of the first bottle */
  fill1: number;
  /** 0..1 fill level of second bottle (if 2 slots). -1 = not applicable */
  fill2?: number;
  mood: CowMood;
  /** play moo when mood reaches 'full' or 'payday' */
  playSound?: boolean;
  size?: number; // px, default 120
}

/* ─────────────────────────────────────────────────────────────
   Web-Audio moo synthesiser
   ──────────────────────────────────────────────────────────── */
function playMoo(ctx: AudioContext, happy = false) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  filter.type = 'lowpass';
  filter.frequency.value = 800;

  osc.type = 'sawtooth';
  const base = happy ? 130 : 110;
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.linearRampToValueAtTime(base * (happy ? 1.6 : 1.3), now + 0.25);
  osc.frequency.linearRampToValueAtTime(base * (happy ? 1.1 : 0.85), now + 0.9);
  if (happy) {
    osc.frequency.linearRampToValueAtTime(base * 1.5, now + 1.2);
    osc.frequency.linearRampToValueAtTime(base * 1.0, now + 1.6);
  }

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
  gain.gain.setValueAtTime(0.18, now + (happy ? 1.3 : 0.7));
  gain.gain.linearRampToValueAtTime(0, now + (happy ? 1.8 : 1.0));

  osc.start(now);
  osc.stop(now + (happy ? 2.0 : 1.1));
}

/* ─────────────────────────────────────────────────────────────
   Milk bottle SVG — fill 0..1
   ──────────────────────────────────────────────────────────── */
function MilkBottle({
  fill,
  animating,
  size = 44,
}: {
  fill: number;
  animating: boolean;
  size?: number;
}) {
  const clampedFill = Math.max(0, Math.min(1, fill));
  // Bottle inner area: y from 14 to 70 (height 56) inside viewBox 0 0 40 80
  const innerTop = 14;
  const innerH = 56;
  const fillH = innerH * clampedFill;
  const fillY = innerTop + innerH - fillH;

  // Milk color transitions: empty=white, half=light-blue-tint, full=pure white with blue sheen
  const milkColor = clampedFill > 0.8 ? '#e8f4fd' : clampedFill > 0.4 ? '#ddeeff' : '#f0f8ff';

  return (
    <svg
      width={size}
      height={size * 2}
      viewBox="0 0 40 80"
      style={{
        filter: animating ? 'drop-shadow(0 0 6px rgba(59,130,246,0.6))' : undefined,
        transition: 'filter 0.3s',
      }}
    >
      <defs>
        <clipPath id="bottleClip">
          {/* Bottle shape clip */}
          <path d="M14,6 Q14,2 20,2 Q26,2 26,6 L28,14 Q34,16 34,22 L34,68 Q34,76 20,76 Q6,76 6,68 L6,22 Q6,16 12,14 Z" />
        </clipPath>
        <linearGradient id="bottleGlass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(200,220,255,0.4)" />
        </linearGradient>
        <linearGradient id="milkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c8e6fa" />
          <stop offset="40%" stopColor={milkColor} />
          <stop offset="100%" stopColor="#b8d8f0" />
        </linearGradient>
        <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e53e3e" />
          <stop offset="100%" stopColor="#c53030" />
        </linearGradient>
      </defs>

      {/* Bottle body outline */}
      <path
        d="M14,6 Q14,2 20,2 Q26,2 26,6 L28,14 Q34,16 34,22 L34,68 Q34,76 20,76 Q6,76 6,68 L6,22 Q6,16 12,14 Z"
        fill="rgba(230,245,255,0.5)"
        stroke="#94c8e8"
        strokeWidth="1.5"
      />

      {/* Milk fill — animated */}
      <rect
        x="6" y={fillY} width="28" height={fillH + 2}
        fill="url(#milkGrad)"
        clipPath="url(#bottleClip)"
        style={{ transition: animating ? 'y 1.2s cubic-bezier(0.4,0,0.2,1), height 1.2s cubic-bezier(0.4,0,0.2,1)' : 'y 0.6s ease, height 0.6s ease' }}
      />

      {/* Milk surface ripple when animating */}
      {animating && clampedFill > 0 && (
        <ellipse
          cx="20" cy={fillY + 1} rx="10" ry="2"
          fill="rgba(255,255,255,0.6)"
          style={{ animation: 'milkRipple 0.8s ease-out infinite' }}
        />
      )}

      {/* Glass sheen overlay */}
      <path
        d="M14,6 Q14,2 20,2 Q26,2 26,6 L28,14 Q34,16 34,22 L34,68 Q34,76 20,76 Q6,76 6,68 L6,22 Q6,16 12,14 Z"
        fill="url(#bottleGlass)"
        clipPath="url(#bottleClip)"
      />

      {/* Cap */}
      <rect x="13" y="0" width="14" height="7" rx="3" fill="url(#capGrad)" />
      <rect x="15" y="1" width="4" height="5" rx="1" fill="rgba(255,255,255,0.3)" />

      {/* Label band */}
      <rect x="7" y="30" width="26" height="18" rx="3" fill="rgba(255,255,255,0.55)" stroke="#b0d8f0" strokeWidth="0.5" />
      <text x="20" y="42" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#2b6cb0" fontFamily="sans-serif">
        🥛
      </text>

      {/* Fill % text */}
      {clampedFill > 0 && (
        <text x="20" y="58" textAnchor="middle" fontSize="5.5" fill="#2b6cb0" fontFamily="sans-serif" fontWeight="bold">
          {Math.round(clampedFill * 100)}%
        </text>
      )}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Realistic Cow SVG
   Moods: idle | happy | dancing
   ──────────────────────────────────────────────────────────── */
function CowSVG({ mood, size = 120 }: { mood: CowMood; size?: number }) {
  const dancing = mood === 'payday';
  const happy = mood === 'full' || mood === 'payday';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      style={{
        animation: dancing
          ? 'cowDance 0.5s ease-in-out infinite alternate'
          : happy
          ? 'cowBob 1s ease-in-out infinite alternate'
          : undefined,
        transformOrigin: 'bottom center',
        display: 'block',
      }}
    >
      <defs>
        <radialGradient id="bodyGrad" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#f5f0eb" />
          <stop offset="100%" stopColor="#d9cfc4" />
        </radialGradient>
        <radialGradient id="headGrad" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#f7f2ed" />
          <stop offset="100%" stopColor="#ddd0c4" />
        </radialGradient>
        <radialGradient id="snoutGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0b8a0" />
          <stop offset="100%" stopColor="#e0967a" />
        </radialGradient>
        {/* Spots */}
        <filter id="spotBlur">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* ── BODY ── */}
      <ellipse cx="60" cy="80" rx="32" ry="24" fill="url(#bodyGrad)" stroke="#c4b8aa" strokeWidth="1" />

      {/* Body spots */}
      <ellipse cx="48" cy="74" rx="10" ry="7" fill="#2d2d2d" opacity="0.75" filter="url(#spotBlur)" />
      <ellipse cx="72" cy="82" rx="8" ry="5" fill="#2d2d2d" opacity="0.7" filter="url(#spotBlur)" />
      <ellipse cx="58" cy="88" rx="5" ry="4" fill="#2d2d2d" opacity="0.5" filter="url(#spotBlur)" />

      {/* Belly / udder area */}
      <ellipse cx="60" cy="96" rx="16" ry="8" fill="#f0c8b8" stroke="#e0a898" strokeWidth="0.5" />
      {/* Teats */}
      <ellipse cx="52" cy="102" rx="3" ry="4" fill="#e8a898" stroke="#d09080" strokeWidth="0.5" />
      <ellipse cx="60" cy="103" rx="3" ry="4" fill="#e8a898" stroke="#d09080" strokeWidth="0.5" />
      <ellipse cx="68" cy="102" rx="3" ry="4" fill="#e8a898" stroke="#d09080" strokeWidth="0.5" />

      {/* ── LEGS ── dancing shifts them */}
      {/* Front left */}
      <rect
        x="42" y="98" width="8" height="16" rx="4"
        fill="#d9cfc4" stroke="#c4b8aa" strokeWidth="0.8"
        style={{
          transformOrigin: '46px 98px',
          animation: dancing ? 'legFL 0.5s ease-in-out infinite alternate' : undefined,
        }}
      />
      {/* Front right */}
      <rect
        x="56" y="98" width="8" height="16" rx="4"
        fill="#d9cfc4" stroke="#c4b8aa" strokeWidth="0.8"
        style={{
          transformOrigin: '60px 98px',
          animation: dancing ? 'legFR 0.5s ease-in-out infinite alternate' : undefined,
        }}
      />
      {/* Back left */}
      <rect
        x="66" y="99" width="8" height="15" rx="4"
        fill="#cfc4b8" stroke="#b8aa9d" strokeWidth="0.8"
        style={{
          transformOrigin: '70px 99px',
          animation: dancing ? 'legBL 0.5s ease-in-out 0.25s infinite alternate' : undefined,
        }}
      />
      {/* Back right */}
      <rect
        x="78" y="99" width="8" height="15" rx="4"
        fill="#cfc4b8" stroke="#b8aa9d" strokeWidth="0.8"
        style={{
          transformOrigin: '82px 99px',
          animation: dancing ? 'legBR 0.5s ease-in-out 0.25s infinite alternate' : undefined,
        }}
      />

      {/* Hooves */}
      <ellipse cx="46" cy="114" rx="4.5" ry="2.5" fill="#3d3020" />
      <ellipse cx="60" cy="114" rx="4.5" ry="2.5" fill="#3d3020" />
      <ellipse cx="70" cy="113" rx="4.5" ry="2.5" fill="#3d3020" />
      <ellipse cx="82" cy="113" rx="4.5" ry="2.5" fill="#3d3020" />

      {/* Tail */}
      <path
        d="M28,75 Q18,65 22,58 Q26,52 24,46"
        stroke="#c4b8aa" strokeWidth="3" fill="none" strokeLinecap="round"
        style={{ animation: dancing ? 'tailWag 0.4s ease-in-out infinite alternate' : happy ? 'tailWag 1s ease-in-out infinite alternate' : undefined }}
      />
      {/* Tail tuft */}
      <ellipse cx="24" cy="45" rx="5" ry="3" fill="#2d2d2d" transform="rotate(-20,24,45)" />

      {/* ── HEAD ── */}
      <ellipse cx="88" cy="62" rx="18" ry="16" fill="url(#headGrad)" stroke="#c4b8aa" strokeWidth="1" />

      {/* Head spot */}
      <ellipse cx="84" cy="56" rx="7" ry="5" fill="#2d2d2d" opacity="0.6" filter="url(#spotBlur)" />

      {/* Ears */}
      <ellipse cx="76" cy="50" rx="5" ry="8" fill="#d9cfc4" stroke="#c4b8aa" strokeWidth="0.8" transform="rotate(-20,76,50)" />
      <ellipse cx="76" cy="50" rx="2.5" ry="5" fill="#e8b0a0" transform="rotate(-20,76,50)" />
      <ellipse cx="100" cy="50" rx="5" ry="8" fill="#d9cfc4" stroke="#c4b8aa" strokeWidth="0.8" transform="rotate(20,100,50)" />
      <ellipse cx="100" cy="50" rx="2.5" ry="5" fill="#e8b0a0" transform="rotate(20,100,50)" />

      {/* Horns */}
      <path d="M79,47 Q75,36 72,33" stroke="#c8a060" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M97,47 Q101,36 104,33" stroke="#c8a060" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* Snout */}
      <ellipse cx="94" cy="72" rx="11" ry="8" fill="url(#snoutGrad)" stroke="#d0907a" strokeWidth="0.8" />
      {/* Nostrils */}
      <ellipse cx="90" cy="73" rx="2.5" ry="2" fill="#c07060" />
      <ellipse cx="98" cy="73" rx="2.5" ry="2" fill="#c07060" />
      {/* Nostril shine */}
      <ellipse cx="89.5" cy="72.3" rx="1" ry="0.7" fill="rgba(255,255,255,0.5)" />
      <ellipse cx="97.5" cy="72.3" rx="1" ry="0.7" fill="rgba(255,255,255,0.5)" />

      {/* Eyes */}
      {happy ? (
        <>
          {/* Happy closed/squint eyes */}
          <path d="M81,59 Q83,56 85,59" stroke="#2d2020" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M91,59 Q93,56 95,59" stroke="#2d2020" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* Rosy cheeks */}
          <ellipse cx="82" cy="64" rx="4" ry="2.5" fill="#f0a0a0" opacity="0.5" />
          <ellipse cx="95" cy="64" rx="4" ry="2.5" fill="#f0a0a0" opacity="0.5" />
        </>
      ) : (
        <>
          {/* Normal eyes */}
          <ellipse cx="83" cy="59" rx="4" ry="4.5" fill="white" stroke="#2d2020" strokeWidth="0.8" />
          <ellipse cx="83" cy="60" rx="2.5" ry="3" fill="#3d2010" />
          <ellipse cx="83.8" cy="59" rx="1" ry="1" fill="white" />
          <ellipse cx="93" cy="59" rx="4" ry="4.5" fill="white" stroke="#2d2020" strokeWidth="0.8" />
          <ellipse cx="93" cy="60" rx="2.5" ry="3" fill="#3d2010" />
          <ellipse cx="93.8" cy="59" rx="1" ry="1" fill="white" />
        </>
      )}

      {/* Mouth */}
      {happy ? (
        <path d="M87,78 Q91,82 95,78" stroke="#c07060" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M88,78 Q91,80 94,78" stroke="#c07060" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      )}

      {/* Tongue on very happy */}
      {mood === 'payday' && (
        <ellipse cx="91" cy="81" rx="3.5" ry="2.5" fill="#e87070" stroke="#c05050" strokeWidth="0.5" />
      )}

      {/* Stars / sparkles around happy cow */}
      {happy && (
        <>
          <text x="28" y="45" fontSize="10" style={{ animation: 'sparkle 1s ease-in-out infinite alternate' }}>✨</text>
          <text x="100" y="35" fontSize="8" style={{ animation: 'sparkle 1s ease-in-out 0.4s infinite alternate' }}>⭐</text>
          {mood === 'payday' && (
            <>
              <text x="14" y="68" fontSize="9" style={{ animation: 'sparkle 0.7s ease-in-out infinite alternate' }}>🎉</text>
              <text x="96" y="25" fontSize="9" style={{ animation: 'sparkle 0.7s ease-in-out 0.3s infinite alternate' }}>💰</text>
            </>
          )}
        </>
      )}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Speech bubble
   ──────────────────────────────────────────────────────────── */
function SpeechBubble({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div
      className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-md whitespace-nowrap transition-all duration-500 ${
        visible ? 'opacity-100 -translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
      style={{ zIndex: 10 }}
    >
      {text}
      <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-600 rotate-45" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Widget
   ──────────────────────────────────────────────────────────── */
const MOO_MESSAGES: Record<CowMood, string[]> = {
  empty: ['Mooo...', 'Need milk!', 'Feed me data 🥛'],
  half: ['Getting there!', 'Mooo~ 🍼', 'More milk coming!'],
  full: ['Mooo! 🎉', 'All full! 🥛', 'Great job! ✨'],
  payday: ['PAY DAY! 💰', 'Mooo!! 🎊', 'Money time! 🤑'],
};

export function MilkieWidget({
  fill1,
  fill2 = -1,
  mood,
  playSound = true,
  size = 120,
}: MilkieWidgetProps) {
  const [bubble, setBubble] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [animating1, setAnimating1] = useState(false);
  const [animating2, setAnimating2] = useState(false);
  const prevMood = useRef<CowMood>('empty');
  const prevFill1 = useRef(0);
  const prevFill2 = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = (msg: string) => {
    setBubble(msg);
    setShowBubble(true);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setShowBubble(false), 2800);
  };

  useEffect(() => {
    const msgs = MOO_MESSAGES[mood];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];

    // Detect fill changes
    if (fill1 !== prevFill1.current) {
      setAnimating1(true);
      setTimeout(() => setAnimating1(false), 1500);
    }
    if (fill2 >= 0 && fill2 !== prevFill2.current) {
      setAnimating2(true);
      setTimeout(() => setAnimating2(false), 1500);
    }

    // Detect mood upgrade → moo
    if (mood !== prevMood.current) {
      showMessage(msg);
      if (playSound && (mood === 'full' || mood === 'payday')) {
        try {
          if (!audioRef.current || audioRef.current.state === 'closed') {
            audioRef.current = new AudioContext();
          }
          playMoo(audioRef.current, mood === 'payday');
          if (mood === 'payday') {
            // Extra moo after a second
            setTimeout(() => {
              if (audioRef.current && audioRef.current.state !== 'closed') {
                playMoo(audioRef.current, true);
              }
            }, 1000);
          }
        } catch (e) {
          console.warn('Moo audio failed:', e);
        }
      }
    }

    prevMood.current = mood;
    prevFill1.current = fill1;
    prevFill2.current = fill2 >= 0 ? fill2 : 0;
  }, [mood, fill1, fill2, playSound]);

  const cowSize = size * 0.9;
  const bottleSize = size * 0.32;

  return (
    <div className="relative flex flex-col items-center select-none" style={{ width: size, minHeight: size + 20 }}>
      {/* Speech bubble */}
      <SpeechBubble text={bubble} visible={showBubble} />

      {/* Bottles row */}
      <div className="flex items-end gap-2 mb-1">
        <MilkBottle fill={fill1} animating={animating1} size={bottleSize} />
        {fill2 >= 0 && (
          <MilkBottle fill={fill2} animating={animating2} size={bottleSize} />
        )}
      </div>

      {/* Cow */}
      <div
        className="cursor-pointer"
        onClick={() => {
          const msgs = MOO_MESSAGES[mood];
          showMessage(msgs[Math.floor(Math.random() * msgs.length)]);
          if (playSound) {
            try {
              if (!audioRef.current || audioRef.current.state === 'closed') {
                audioRef.current = new AudioContext();
              }
              playMoo(audioRef.current, mood === 'full' || mood === 'payday');
            } catch (e) { /* silent */ }
          }
        }}
        title="Click to moo!"
      >
        <CowSVG mood={mood} size={cowSize} />
      </div>

      {/* Mood label */}
      <div className="text-[10px] font-semibold text-center mt-0.5 text-muted-foreground">
        {mood === 'payday' ? '🎊 PAY DAY!' : mood === 'full' ? '🥛 Full!' : mood === 'half' ? '🍼 Half full' : '⏳ Waiting...'}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hook: derive mood + fills from day entries
   ──────────────────────────────────────────────────────────── */
export function useCowMood(
  entries: { liters: number; timeSlot: string }[],
  timeSlots: string[],
  isPayDay: boolean,
  isPaid: boolean
): { mood: CowMood; fill1: number; fill2: number } {
  if (isPayDay && isPaid) return { mood: 'payday', fill1: 1, fill2: timeSlots.length >= 2 ? 1 : -1 };

  const slotCount = timeSlots.length;
  if (slotCount === 0) return { mood: 'empty', fill1: 0, fill2: -1 };

  const slot1 = timeSlots[0];
  const slot2 = timeSlots[1] ?? null;

  const e1 = entries.find((e) => e.timeSlot === slot1);
  const e2 = slot2 ? entries.find((e) => e.timeSlot === slot2) : null;

  if (slotCount === 1) {
    const fill = e1 ? 1 : 0;
    const mood: CowMood = fill === 1 ? 'full' : 'empty';
    return { mood, fill1: fill, fill2: -1 };
  }

  // 2 slots
  const fill1 = e1 ? 1 : 0;
  const fill2 = e2 ? 1 : 0;
  let mood: CowMood = 'empty';
  if (fill1 === 1 && fill2 === 1) mood = 'full';
  else if (fill1 === 1 || fill2 === 1) mood = 'half';

  return { mood, fill1, fill2 };
}
