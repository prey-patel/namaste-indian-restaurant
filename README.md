# Namaste Indian Restaurant - Premium Digital Platform

This is the Next.js App Router codebase for **Namaste Indian Restaurant** in Warszawska 1/3, Ciechanów, Poland.

## Phase 1 Scaffolding
*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript (strict mode)
*   **Styling:** Tailwind CSS + shadcn/ui
*   **Locales:** Polish (`pl`) and English (`en`) using `next-intl`
*   **DB Integration:** Supabase (SSR connection helpers)

## Phase 2 Backend & Security Foundation (Current)
*   **Setup Script:** [supabase/migrations/20260613000000_phase_2_backend_foundation.sql](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/supabase/migrations/20260613000000_phase_2_backend_foundation.sql)
*   **Verification Script:** [supabase/verify_phase_2.sql](file:///d:/Antigravity/Namaste%20Indian%20Restaurant/supabase/verify_phase_2.sql)
*   **Security Architecture:** Detailed Row Level Security (RLS) policies, database triggers for overlap validation and log capturing, secure tracking RPCs, and Option B (Private Storage image buckets).
*   **Documentation:** Located in the `docs` folder.

---

## How to Run Locally

1.  **Clone / open the directory:**
    Ensure you are in the workspace root: `d:\Antigravity\Namaste Indian Restaurant`.

2.  **Environment Setup:**
    Create a `.env.local` file by copying the template:
    ```bash
    cp .env.example .env.local
    ```
    Add your actual keys to `.env.local`.

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

4.  **Launch Dev Server:**
    ```bash
    npm run dev
    ```

5.  **Build and Validate:**
    Verify TypeScript check, ESLint rules, and build configurations:
    ```bash
    npm run typecheck
    ```
    ```bash
    npm run lint
    ```
    ```bash
    npm run build
    ```
