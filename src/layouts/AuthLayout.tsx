// ── Auth Layout ───────────────────────────────────────────────────────────────
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Abstract financial/data-network SVG illustration for the left panel.
 * Composed of soft arcs, data nodes, grid lines and a rising trend area —
 * all in very low-opacity white/slate so they sit behind the slogan without
 * competing. Scales to fill the panel via preserveAspectRatio="xMidYMid slice".
 */
function LeftPanelVisual() {
  return (
    <svg
      viewBox="0 0 520 700"
      fill="none"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {/* Base subtle gradient wash */}
      <defs>
        <radialGradient id="glow1" cx="30%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#334155" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow2" cx="75%" cy="70%" r="50%">
          <stop offset="0%" stopColor="#1E3A5F" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#0A1628" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.0" />
          <stop offset="30%" stopColor="#CBD5E1" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#E2E8F0" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Background glow washes */}
      <rect width="520" height="700" fill="url(#glow1)" />
      <rect width="520" height="700" fill="url(#glow2)" />

      {/* Very subtle grid — horizontal lines */}
      {[140, 210, 280, 350, 420, 490].map((y) => (
        <line key={y} x1="0" y1={y} x2="520" y2={y}
          stroke="#E2E8F0" strokeWidth="0.5" strokeOpacity="0.05" />
      ))}
      {/* Vertical grid lines */}
      {[104, 208, 312, 416].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="700"
          stroke="#E2E8F0" strokeWidth="0.5" strokeOpacity="0.04" />
      ))}

      {/* Rising trend area fill */}
      <path
        d="M0,580 C60,520 110,490 160,440 C210,390 240,360 290,310
           C340,260 380,230 430,195 C460,175 490,165 520,158 L520,700 L0,700 Z"
        fill="url(#areaFill)"
      />

      {/* Primary rising line */}
      <path
        d="M0,580 C60,520 110,490 160,440 C210,390 240,360 290,310
           C340,260 380,230 430,195 C460,175 490,165 520,158"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Secondary line — offset, more muted */}
      <path
        d="M0,620 C55,568 105,542 152,498 C200,454 232,425 278,380
           C325,335 364,308 412,275 C445,254 482,244 520,238"
        stroke="#94A3B8"
        strokeWidth="1"
        strokeOpacity="0.10"
        strokeLinecap="round"
        strokeDasharray="6 8"
      />

      {/* Data nodes on primary line */}
      {[
        [160, 440], [290, 310], [430, 195],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="5" fill="#1E293B" stroke="#CBD5E1" strokeWidth="1.5" strokeOpacity="0.25" />
          <circle cx={cx} cy={cy} r="2.5" fill="#E2E8F0" fillOpacity="0.30" />
        </g>
      ))}

      {/* Decorative connection arcs between data nodes */}
      <path d="M160,440 Q225,340 290,310" stroke="#CBD5E1" strokeWidth="0.8" strokeOpacity="0.08" fill="none" />
      <path d="M290,310 Q360,250 430,195" stroke="#CBD5E1" strokeWidth="0.8" strokeOpacity="0.08" fill="none" />

      {/* Abstract network nodes — scattered, low opacity */}
      {[
        [70, 200], [130, 310], [380, 420], [460, 350], [50, 500],
        [480, 560], [200, 600], [330, 580],
      ].map(([cx, cy]) => (
        <circle key={`n${cx}${cy}`} cx={cx} cy={cy} r="2.5"
          fill="#94A3B8" fillOpacity="0.12" />
      ))}

      {/* Light connecting lines between network nodes */}
      <line x1="70"  y1="200" x2="130" y2="310" stroke="#94A3B8" strokeWidth="0.6" strokeOpacity="0.07" />
      <line x1="380" y1="420" x2="460" y2="350" stroke="#94A3B8" strokeWidth="0.6" strokeOpacity="0.07" />
      <line x1="50"  y1="500" x2="200" y2="600" stroke="#94A3B8" strokeWidth="0.6" strokeOpacity="0.07" />
      <line x1="200" y1="600" x2="330" y2="580" stroke="#94A3B8" strokeWidth="0.6" strokeOpacity="0.07" />

      {/* Bottom gradient overlay — ensures slogan legibility */}
      <defs>
        <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F172A" stopOpacity="0" />
          <stop offset="55%" stopColor="#0F172A" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#0A1628" stopOpacity="0.92" />
        </linearGradient>
      </defs>
      <rect width="520" height="700" fill="url(#bottomFade)" />
    </svg>
  );
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-[#F8F9FA] dark:bg-[#0A1628]">

      {/* ── Left branding panel — hidden on mobile ── */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0A1628 0%, #0F172A 40%, #1A2744 80%, #0A1628 100%)' }}
      >
        {/* Abstract premium SVG visual */}
        <LeftPanelVisual />

        {/* Logo — top-left, above everything */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            FinWise <span style={{ color: '#CBD5E1' }}>AI</span>
          </span>
        </div>

        {/* Slogan — vertically centered, bottom-anchored toward lower third */}
        <div className="relative z-10 flex-1 flex flex-col justify-end pb-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-4"
            style={{ color: 'rgba(203,213,225,0.45)' }}>
            FinWise AI
          </p>
          <h2 className="text-[2rem] font-bold text-white leading-tight tracking-tight mb-3 max-w-xs">
            Smarter Money.<br />Better Decisions.<br />A Better Future.
          </h2>
          <p className="text-sm" style={{ color: 'rgba(203,213,225,0.55)' }}>
            Your intelligent financial companion for student life.
          </p>
        </div>
      </div>

      {/* ── Right auth form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F8F9FA] dark:bg-[#0A1628]">
        <div className="w-full max-w-md">

          {/* Mobile logo — only visible when left panel is hidden */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9]">
              FinWise AI
            </span>
          </div>

          {/* Auth card */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-modal p-8
            border border-[#E5E7EB] dark:border-white/[0.08]
            relative overflow-hidden fade-in">
            {/* Subtle top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, #0F172A, #334155, #4B5563)' }} />
            {children}
          </div>

        </div>
      </div>
    </div>
  );
}
