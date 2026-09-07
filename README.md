# FinWise AI

**AI-Powered Financial Copilot & Decision-Support Platform for Students**

FinWise AI is a comprehensive, AI-powered financial management ecosystem designed specifically for students and young adults. It bridges the financial literacy gap by providing real-time analytics, dynamic budgeting tools, loan application features, and personalized AI-driven financial insights.

---

## 🎯 The Financial Safety Principle

> **The frontend never independently calculates authoritative financial values.**
> Every EMI, interest rate, affordability score, and financial health score is strictly calculated by the FastAPI backend using standard reducing-balance math and secure database transactions. The React frontend exists purely to display data beautifully, while the AI exists to explain it contextually.

---

## ✨ Features & Implementation Details

### 1. Authentication & Security
* **What it does:** Secure entry point supporting traditional email/password and Google OAuth login.
* **Tech Stack:** React Hook Form + Zod (frontend validation), `@react-oauth/google`, FastAPI, JWT (JSON Web Tokens), `passlib` (bcrypt hashing).
* **Working:** Validates input securely, verifies via PostgreSQL, and issues a JWT token. The token is stored locally via **Zustand** and attached to all subsequent Axios requests.

### 2. Dashboard & Data Aggregation
* **What it does:** A unified command center showing wallet balance, monthly income/expenses, and quick charts.
* **Tech Stack:** **TanStack React Query** (data fetching/caching) and **Recharts** (SVG charts).
* **Working:** Fetches data from multiple backend endpoints in parallel. React Query caches this data to prevent UI freezing, seamlessly updating the charts as you navigate.

### 3. Transactions & Income (ACID Compliant)
* **What it does:** Users manually log expenses, deposits, and scholarships.
* **Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL.
* **Working:** When a transaction is logged, the backend opens an **ACID transaction**. It adds the transaction row and deducts/adds to the user's `Wallet` table simultaneously. If one fails, both roll back, guaranteeing mathematical perfection.

### 4. Dynamic Budgets
* **What it does:** Sets and tracks maximum monthly limits for categories like 'Food' or 'Transport'.
* **Tech Stack:** Tailwind CSS (dynamic widths), Python (aggregation).
* **Working:** The backend scans the current month's transactions, filters by category, and divides by the budget limit. The frontend turns this percentage into dynamic Tailwind progress bars (e.g., `w-[75%]`).

### 5. Educational Loan System
* **What it does:** A dual-sided system where students apply for loans, and Bank Officers approve/reject them.
* **Tech Stack:** Python (strict financial math).
* **Working:** Enforcing our Safety Principle, the Python backend calculates the exact Amortization schedule and compound interest (`EMI = P × r × (1+r)^n / ((1+r)^n - 1)`).

### 6. Affordability Calculator
* **What it does:** Tells the user if they can safely afford a large purchase (like a phone).
* **Working:** Subtracts active loan EMIs, fixed expenses, and savings goal contributions from the user's monthly income to find their true *Disposable Income*. If the item consumes > 50%, it issues a warning.

### 7. Financial Health Score (The 61.2 Algorithm)
* **What it does:** Grades users out of 100 on 6 financial metrics (Savings Rate, Budget Adherence, Debt Burden, Spending Stability, Goal Progress, Emergency Reserve).
* **Working:** This is a live mathematical algorithm. For example, a completely blank new account defaults to **61.2**. This happens because neutral scores (like perfect 0 debt = 20pts, 0 budgets exceeded = 20pts) evaluate to exactly `61.25`. Python 3 uses *Banker's Rounding*, cleanly rendering it as `61.2`. The moment a user logs a transaction, the score recalculates.

### 8. AI Copilot
* **What it does:** A personalized financial advisor.
* **Working:** We securely serialize the user's real backend data (their wallet balance, active loans, and exact budget deficits) and inject it into the System Prompt of a Large Language Model. This grounds the AI in reality, allowing it to give hyper-personalized, mathematically accurate advice.

---

## 🛠 Tech Stack

### Frontend (Client-Side)
* **Framework:** React 18 + Vite (TypeScript)
* **State Management:** Zustand (Global) + TanStack React Query (Server)
* **Routing:** React Router v6
* **UI & Styling:** Tailwind CSS, Lucide React (Icons)
* **Data Visualization:** Recharts
* **Forms:** React Hook Form + Zod

### Backend (Server-Side)
* **Framework:** FastAPI (Python 3.12)
* **Database:** PostgreSQL
* **ORM & Migrations:** SQLAlchemy + Alembic
* **Authentication:** JWT, passlib, Google OAuth2
* **Infrastructure:** Docker (`docker-compose`)

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
