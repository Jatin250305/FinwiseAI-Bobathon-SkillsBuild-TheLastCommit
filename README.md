# FinWise AI

**AI-Powered Financial Copilot & Decision-Support Platform for Students**

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env.local
# Edit .env.local and set VITE_API_BASE_URL to your FastAPI backend

# 3. Start development server
npm run dev
```

Then open http://localhost:5173

**Demo login:** `jatin@example.com` / `password123`

---

## Project Structure

```
src/
├── types/          # TypeScript interfaces for all domain models
├── services/       # API/service layer (swap mock → real API here)
├── store/          # Zustand stores (auth, UI)
├── utils/          # Helpers (formatting, classnames)
├── layouts/        # AppLayout (protected) + AuthLayout (auth pages)
├── components/
│   ├── ui/         # Shared components (StatCard, Modal, BudgetProgress…)
│   ├── navigation/ # Sidebar + TopHeader
│   └── analytics/  # AIInsightCard
└── pages/          # One file per route
```

---

## Connecting to the Backend

Each service file in `src/services/` contains a `delay()`-based mock implementation.
To connect to your FastAPI backend:

1. Set `VITE_API_BASE_URL=http://your-backend-url` in `.env.local`
2. Replace the mock implementation in each service with `apiClient.get/post/put/delete` calls
3. The `apiClient` in `src/services/api.ts` handles auth tokens and error normalization automatically

---

## Financial Safety Principle

> The frontend **never** independently calculates authoritative financial values.
> EMI, interest, total repayment, affordability scores, and financial health scores
> must all come from the backend. The frontend displays results; the AI explains them.

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Routing | React Router v6 |
| State | Zustand |
| HTTP | Axios |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Notifications | React Hot Toast |

---

## Color Palette

| Color | Hex | Usage |
|---|---|---|
| Dark | `#0C2023` | Sidebar, headings |
| Slate | `#485556` | Secondary text, borders |
| Primary | `#894335` | Buttons, active nav |
| Secondary | `#AB776B` | Hover states |
| Neutral | `#AC968E` | Card backgrounds |
| Muted | `#897A74` | Supporting text |
# finwise-ai
# finwise-ai
# finwise-ai-Bobathon
