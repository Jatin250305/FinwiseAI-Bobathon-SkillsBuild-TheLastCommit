# FinWise AI

**AI-Powered Financial Copilot & Decision-Support Platform for Students**

FinWise AI is a comprehensive, AI-driven financial management ecosystem designed specifically for students and young adults. It bridges the financial literacy gap by providing real-time analytics, dynamic budgeting tools, loan application pipelines, and personalized AI-driven financial insights.

---

## 🎯 The Financial Safety Principle

> **The frontend never independently calculates authoritative financial values.**
> Every EMI, interest rate, affordability score, and financial health metric is strictly calculated by the FastAPI backend using standard reducing-balance math and secure database transactions. The React frontend exists purely to display data beautifully, while the AI exists to explain it contextually.

---

## 📱 Deep Dive: Platform Pages & Features

### 1. Authentication & Security (`LoginPage.tsx` & `RegisterPage.tsx`)
* **Features:** Secure entry point supporting traditional email/password and modern Google OAuth login.
* **Development & Tech Stack:** Frontend uses **React Hook Form** paired with **Zod** for strict input validation, and `@react-oauth/google`. The backend uses **FastAPI**, **passlib** (for bcrypt hashing), and **JWT** (JSON Web Tokens).
* **Real-World Working:** When a user logs in, the backend verifies credentials against a **PostgreSQL** database and issues a JWT token. The frontend stores this token globally using **Zustand** and automatically attaches it to all future Axios requests.
* **Student Benefit:** Guarantees that sensitive financial data is locked behind enterprise-grade security protocols, giving students peace of mind.

### 2. The Financial Dashboard (`DashboardPage.tsx`)
* **Features:** A unified command center showing wallet balance, monthly income, expenses, surplus, and quick spending charts.
* **Development & Tech Stack:** Built with **React** and **Tailwind CSS**. Relies heavily on **TanStack React Query** for server-state caching and **Recharts** for SVG data visualization.
* **Real-World Working:** Fetches data from multiple FastAPI endpoints in parallel. React Query caches this data locally so the UI renders instantly on return visits, seamlessly syncing in the background.
* **Student Benefit:** Traditional banking apps are often confusing and cluttered. This single pane of glass provides an immediate, stress-free snapshot of their exact financial standing.

### 3. Transactions & Income (`TransactionsPage.tsx` & `IncomePage.tsx`)
* **Features:** A digital ledger for logging daily expenses, paycheck deposits, and scholarships.
* **Development & Tech Stack:** Frontend forms pass strict Zod validation before hitting the backend's **SQLAlchemy** ORM.
* **Real-World Working:** This uses **ACID-compliant database transactions**. When a user logs a $50 expense, the backend simultaneously inserts the transaction row and deducts $50 from the user's overall Wallet table. If the wallet update fails, the entire request rolls back.
* **Student Benefit:** Teaches students the vital habit of accounting for every dollar, ensuring their digital wallet balance is mathematically flawless.

### 4. Dynamic Budgets (`BudgetPage.tsx`)
* **Features:** Allows users to set maximum monthly spending limits for specific categories (e.g., 'Food', 'Transport').
* **Development & Tech Stack:** The Python backend handles aggregation logic, while the frontend utilizes dynamic **Tailwind CSS** utility classes (e.g., `w-[75%]`).
* **Real-World Working:** The backend scans the current month's transactions, filters by category, sums the totals, and divides by the budget limit. The frontend translates this into a dynamic, color-coded progress bar.
* **Student Benefit:** Visually warns students *before* they overspend, teaching proactive financial restraint rather than reactive regret.

### 5. Savings Goals (`SavingsGoalsPage.tsx`)
* **Features:** Gamifies the process of saving for large purchases (e.g., a new laptop or textbook).
* **Development & Tech Stack:** Uses custom SVG components (calculating `stroke-dashoffset`) connected to global **Zustand** state.
* **Real-World Working:** As the user logs a 'savings' transaction, the PostgreSQL database updates the goal's `current_amount`. The UI reacts instantly, filling up a visual ring chart.
* **Student Benefit:** Transforms saving money from a boring chore into an engaging, visually rewarding milestone system.

### 6. Educational Loan System (`LoanApplicationPage.tsx` & `BankReviewPage.tsx`)
* **Features:** A dual-sided pipeline where students apply for educational loans and a 'Bank Officer' persona reviews, approves, or rejects them.
* **Development & Tech Stack:** Strict architectural separation. The React frontend solely collects data. The Python backend handles all mathematical evaluations in `finance.py`.
* **Real-World Working:** The backend calculates the exact Amortization schedule and compound interest using the formula: `EMI = P × r × (1+r)^n / ((1+r)^n - 1)`. 
* **Student Benefit:** Simulates the real-world borrowing process in a safe environment, teaching students how interest rates and loan tenures directly impact their monthly EMIs.

### 7. Affordability Calculator (`AffordabilityPage.tsx`)
* **Features:** A proactive tool that tells the user if they can safely afford a specific large purchase.
* **Development & Tech Stack:** Python-based mathematical evaluation hitting the `affordability.py` router.
* **Real-World Working:** The algorithm subtracts the student's active loan EMIs, fixed expenses, and savings goal contributions from their monthly income to find their true *Disposable Income*. If the desired item consumes more than 50% of this disposable income, it triggers a UI warning.
* **Student Benefit:** Prevents impulse buying by forcing students to confront their actual disposable income versus their gross income.

### 8. Financial Health Score (`FinancialHealthPage.tsx`)
* **Features:** A credit-score-like metric out of 100, visually represented by a 6-axis Radar Chart.
* **Development & Tech Stack:** Visualized via **Recharts**. Graded by a highly complex Python algorithm.
* **Real-World Working:** The algorithm evaluates 6 metrics: Savings Rate, Budget Adherence, Debt Burden, Spending Stability, Goal Progress, and Emergency Reserves. 
  *(Technical note: A brand new account evaluates to exactly `61.25` based on neutral default weights. Because Python 3 uses IEEE 754 'Banker's Rounding'—rounding .5 to the nearest even number—the frontend perfectly displays `61.2` until the user logs their first transaction).*
* **Student Benefit:** Gives students a singular, gamified metric to improve over time, making holistic financial health easy to understand.

### 9. AI Copilot (`AIBotPage.tsx`)
* **Features:** A highly personalized, conversational financial advisor.
* **Development & Tech Stack:** Integrates a Large Language Model (LLM) API directly into the FastAPI backend.
* **Real-World Working:** Unlike generic chatbots, our backend serializes the user's *actual* PostgreSQL data (wallet balance, exact budget deficits, active loans) and securely injects it into the LLM's System Prompt. 
* **Student Benefit:** Instead of generic advice like "save more money", the AI provides hyper-specific, actionable intelligence like "You need to cut your food budget by $30 this week to afford your upcoming laptop goal."

### 10. Reports & Analytics (`ReportsPage.tsx`)
* **Features:** Deep-dive historical data viewing and CSV exporting.
* **Development & Tech Stack:** Standard React tables and browser-based CSV Blob generation.
* **Student Benefit:** Teaches students how to read and maintain formal financial ledgers for tax or auditing purposes.

---

## 🛠 Tech Stack Overview

### Frontend (Client-Side)
* **Framework:** React 18 + Vite (TypeScript)
* **State Management:** Zustand (Global State) + TanStack React Query (Server State)
* **Routing:** React Router v6
* **UI & Styling:** Tailwind CSS, Lucide React (Icons)
* **Data Visualization:** Recharts
* **Forms:** React Hook Form + Zod

### Backend (Server-Side)
* **Framework:** FastAPI (Python 3.12)
* **Database:** PostgreSQL
* **ORM & Migrations:** SQLAlchemy + Alembic
* **Authentication:** JWT, passlib, Google OAuth2
* **Infrastructure:** Docker (`docker-compose.yml`)

---

## 🚀 Quick Start (Running Locally)

You will need two terminal windows to run the full stack.

### 1. Run the Backend
```bash
cd backend/
# Activate virtual environment
source .venv/bin/activate
# Run the FastAPI server
uvicorn app.main:app --reload
```
*The backend will run on `http://localhost:8000`*

### 2. Run the Frontend
```bash
# In the root project directory
npm install
npm run dev
```
*The frontend will run on `http://localhost:5173`*

---

## 🔐 Demo Credentials

Use these credentials to explore the different user personas:

**Student/User Account:**
* **Email:** `jatin@example.com`
* **Password:** `password123`

**Bank Officer (Admin) Account:**
* **Email:** `officer@finwise.com`
* **Password:** `BankOfficer123!`

---

## 👨‍💻 Contributors

- [@jatinkancharla-web](https://github.com/jatinkancharla-web)
- [@Eesha5115](https://github.com/Eesha5115)
- [@Prakrutee](https://github.com/Prakrutee)
- [@DudiDeepak](https://github.com/DudiDeepak)
- [@krithika183](https://github.com/krithika183)

---

## 🤖 IBM Bob Technology Integration

IBM Bob was utilized as the central cognitive engine and development accelerator for the FinWise AI platform, fundamentally shaping both the architecture and the core user experience.

### 1. The AI Copilot (Core Feature Integration)
The most prominent implementation of IBM Bob is within the platform's **AI Copilot** feature (`AIBotPage.tsx` and `ai.py`). Standard financial apps provide numbers without context; IBM Bob acts as the contextual bridge. When a student asks a question like *"Why is my financial health score failing?"*, the FastAPI backend securely serializes the user's actual PostgreSQL data—including their proprietary 6-axis Financial Health Score, wallet balance, and active budget deficits. This raw data is injected into the System Prompt of the IBM Bob LLM endpoint. Because IBM Bob processes this highly contextual prompt, it generates personalized, mathematically accurate advice (e.g., *"You must reduce your Food budget by $30 to comfortably afford your upcoming EMI"*). IBM Bob transforms static database rows into an interactive, educational dialogue.

### 2. Algorithm Generation & Validation
Behind the scenes, IBM Bob technology was heavily utilized during the development phase to architect and validate our complex financial algorithms. Developing accurate, edge-case resilient formulas for reducing-balance EMIs, compound interest calculations, and the weighted 100-point Financial Health Score required immense precision. IBM Bob assisted in generating the core Python mathematical models in `finance.py`, specifically accounting for standard financial rules like "Banker’s Rounding" (IEEE 754), ensuring that the backend logic is enterprise-grade and mathematically sound.

### 3. Workflow Optimization
We integrated IBM Bob into our development workflow to streamline the decoupling of our architecture. By acting as a technical co-pilot, IBM Bob guided the strict separation of concerns—ensuring the React frontend strictly handled state management and UI caching, while the FastAPI backend handled all secure database transactions (ACID compliance) and auth token generation. This allowed us to build a robust, scalable product at hackathon speed without compromising on security or code quality.
