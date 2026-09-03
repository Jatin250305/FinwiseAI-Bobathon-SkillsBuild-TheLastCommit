/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Primary palette ──────────────────────────────────────
        navy: {
          DEFAULT: '#0F172A', // Deep Navy — sidebars, primary dark bg
          800:     '#1E293B', // Slightly lighter navy — elevated dark surfaces
          700:     '#334155', // Mid navy — card surfaces in dark
          600:     '#475569', // Slate-like — secondary dark elements
        },
        slate: {
          DEFAULT: '#4B5563', // Slate — secondary text, icons, borders
        },
        cool: {
          DEFAULT: '#9CA3AF', // Cool Gray — muted text, disabled, labels
        },
        // ── Light mode surfaces ──────────────────────────────────
        surface: {
          DEFAULT:  '#FFFFFF',
          muted:    '#F9FAFB',   // Very subtle off-white page background
          subtle:   '#F3F4F6',   // Gray-100 equivalent
          border:   '#E5E7EB',   // Gray-200
          // Dark mode surfaces
          dark:     '#0F172A',   // Navy — main dark bg
          elevated: '#1E293B',   // Elevated card
          hover:    '#253347',   // Hover state in dark
          deeper:   '#0A1628',   // Even deeper dark bg
          dborder:  'rgba(255,255,255,0.08)', // Dark mode subtle border
        },
        // ── Ink / text ───────────────────────────────────────────
        ink: {
          DEFAULT:   '#0F172A',  // Navy — primary text in light
          secondary: '#4B5563',  // Slate — secondary text
          muted:     '#9CA3AF',  // Cool gray — muted/disabled
          inverse:   '#FFFFFF',
        },
      },
      fontFamily: {
        sans: [
          'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
          'system-ui', 'sans-serif',
        ],
      },
      borderRadius: {
        card:  '16px',
        btn:   '10px',
        xl2:   '20px',
        xl3:   '24px',
      },
      boxShadow: {
        // Light-mode cards
        'card':         '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        'card-hover':   '0 8px 24px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.06)',
        'card-lift':    '0 16px 40px rgba(15,23,42,0.12), 0 4px 10px rgba(15,23,42,0.07)',
        // Modal
        'modal':        '0 24px 64px rgba(15,23,42,0.20)',
        // Glass effects
        'glass':        '0 4px 24px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
        'glass-dark':   '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-navy':   '0 4px 24px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.07)',
        // Glow
        'glow-navy':    '0 0 24px rgba(15,23,42,0.20)',
        'glow-active':  '0 0 0 3px rgba(15,23,42,0.12)',
        // Inner highlight
        'inner':        'inset 0 1px 0 rgba(255,255,255,0.7)',
        'inner-dark':   'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      screens: { xs: '375px' },
      backdropBlur: {
        xs: '2px', sm: '6px', DEFAULT: '12px', md: '16px', lg: '24px',
      },
    },
  },
  safelist: [
    'bg-green-100', 'text-green-700', 'border-green-200',
    'dark:bg-green-900/30', 'dark:text-green-300',
    'bg-yellow-100', 'text-yellow-700', 'border-yellow-200',
    'dark:bg-yellow-900/30', 'dark:text-yellow-300',
    'bg-red-100', 'text-red-700', 'border-red-200',
    'dark:bg-red-900/30', 'dark:text-red-300',
    'w-[5%]','w-[10%]','w-[15%]','w-[20%]','w-[25%]','w-[30%]','w-[35%]',
    'w-[40%]','w-[45%]','w-[50%]','w-[55%]','w-[60%]','w-[65%]',
    'w-[70%]','w-[75%]','w-[80%]','w-[85%]','w-[90%]','w-[95%]','w-[100%]',
  ],
  plugins: [],
}
