# Reverse Diet Visualiser - Project Overview

## 1. Purpose

This web application provides a tool for users to generate and visualize a personalized reverse dieting plan. It guides users through different phases (maintenance, deficit, reverse, new maintenance) based on their inputs and goals, providing weekly calorie targets and estimated progress.

The core idea is to offer a simple, no-login solution where users answer questions, receive a plan, and get a unique, shareable URL to track their progress over time.

## 2. Core Features

*   **Questionnaire:** A single-page form on the homepage (`/`) to gather user inputs:
    *   Personal Stats: Age, Weight (kg), Height (cm), Sex.
    *   Current Estimated Maintenance Calories.
    *   Activity Levels: Initial/Typical, with optional overrides for Deficit, Reverse, and New Maintenance phases.
    *   Diet Goals: Target weight loss (kg), desired daily deficit (kcal), target final maintenance calories, desired weekly calorie increase during the reverse phase (kcal).
*   **Plan Generation:** Backend logic (`src/lib/calculations.ts`) calculates:
    *   Basal Metabolic Rate (BMR) using Mifflin-St Jeor.
    *   Phase-specific Total Daily Energy Expenditure (TDEE) based on activity levels.
    *   Weekly calorie targets for each phase (Initial Maintenance, Calorie Deficit, Post-Deficit Maintenance, Reverse Diet, New Maintenance).
    *   Duration of variable phases (Deficit, Reverse) based on goals.
    *   Estimated weekly weight change and cumulative end weight for each week.
*   **Unique URL Access:**
    *   Upon form submission, the generated plan is stored in a Key-Value store (Vercel KV) associated with a unique ID (`nanoid`).
    *   The user is redirected to a unique URL (`/plan/{unique_id}`).
    *   No user accounts or logins are required.
*   **Visualization Page (`/plan/[id]`):**
    *   Fetches the plan data corresponding to the ID from Vercel KV.
    *   Displays key information for the **current week** (based on system date):
        *   Target Calories.
        *   Upcoming Calorie Change.
        *   Weeks remaining in the current phase.
        *   Weeks remaining in the total plan.
    *   **Interactive Chart:** Displays:
        *   Target daily calories over time (line chart).
        *   Estimated end weight (kg) over time (line chart on a secondary axis).
        *   Highlights the data points for the current week.
        *   Tooltips show week number, phase name, calories, and weight.
    *   **Detailed Table:** Shows the week-by-week breakdown of dates, phase, calories, TDEE, and weight estimates.

## 3. Architecture & Technology Stack

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Frontend:** React (Server and Client Components)
*   **Charting:** Chart.js with `react-chartjs-2` wrapper
*   **Backend Logic:** Next.js API Routes (`src/app/api/create-plan/route.ts`)
*   **Data Storage:** Upstash Redis (via Vercel Marketplace integration, using `@upstash/redis` client)
*   **Unique IDs:** `nanoid`

## 4. Project Structure

```
reverse-diet-visualiser/
├── public/             # Static assets
├── src/
│   ├── app/            # Next.js App Router pages and API routes
│   │   ├── api/        # API route handlers
│   │   │   └── create-plan/route.ts
│   │   ├── plan/
│   │   │   └── [id]/page.tsx # Dynamic plan display page
│   │   ├── page.tsx      # Home page (questionnaire)
│   │   ├── layout.tsx    # Root layout
│   │   └── globals.css   # Global styles
│   ├── components/     # Reusable React components
│   │   └── PlanChart.tsx # Chart component
│   ├── lib/            # Core logic, helpers
│   │   └── calculations.ts # Plan generation logic
│   └── types/          # TypeScript type definitions
│       └── index.ts
├── .env.local          # Local environment variables (from `vercel env pull`)
├── .gitignore
├── next.config.ts      # Next.js configuration
├── package.json
├── PROJECT_OVERVIEW.md # This file
├── tsconfig.json       # TypeScript configuration
└── tailwind.config.ts  # Tailwind CSS configuration
```

## 5. Setup & Running Locally

1.  **Clone:** Clone the repository.
2.  **Navigate:** `cd reverse-diet-visualiser`
3.  **Install:** `npm install` (installs project dependencies including `@upstash/redis`)
4.  **Vercel CLI:** Ensure Vercel CLI is installed (`npm i -g vercel`). You may need to close and reopen your terminal after installation.
5.  **Link Project:** Link the local project to your Vercel project: `vercel link` (follow prompts).
6.  **Environment Variables:** Pull the environment variables from Vercel (requires an Upstash Redis integration linked on Vercel): `vercel env pull .env.local`. This creates a `.env.local` file containing necessary variables like `KV_REST_API_URL` and `KV_REST_API_TOKEN` (Note: Vercel uses the `KV_` prefix for these Upstash variables).
7.  **Run Development Server:** `npm run dev`
8.  **Access:** Open `http://localhost:3000` in your browser.

## 6. Deployment

The application is intended for deployment on Vercel.

1.  Push code to a Git provider (GitHub, GitLab, Bitbucket).
2.  Import the Git repository into a new Vercel project.
3.  **Important:** Ensure the **Root Directory** in Vercel project settings points to `reverse-diet-visualiser` if the repo root is the parent folder.
4.  Go to the project's **Settings -> Storage** tab on Vercel.
5.  Add an **Upstash Redis** integration via the **Vercel Marketplace** (a free tier is available).
6.  Vercel will automatically set the required environment variables (e.g., `KV_REST_API_URL`, `KV_REST_API_TOKEN`) for the integration.
7.  The application code uses `Redis.fromEnv()` from `@upstash/redis` to automatically pick up these variables.
8.  Trigger a deployment.

## 7. Current Status & Known Issues

*   **Core functionality** (form with start date, plan generation, basic display, charting) is implemented.
*   **Data Storage:** Uses Upstash Redis via Vercel Marketplace.
*   **Known Issue:** Plans are successfully created and stored (API route returns success), but the plan display page (`/plan/[id]`) fails to retrieve/parse the data correctly, resulting in a 404. The data fetched from Redis appears as `"[object Object]"` instead of valid JSON, despite attempts to store it correctly using both manual `JSON.stringify` and letting the `@upstash/redis` SDK handle serialization. Further investigation needed.
*   Minor browser console warnings related to CSS parsing (`-webkit-text-size-adjust`, `-moz-osx-font-smoothing`) and font preloading exist but are unrelated to core functionality issues.

*   **Known Issue:** The project is currently experiencing a **build error** when deploying or running `npm run build` locally.
    *   **Error:** `Type error: Type 'PlanPageProps' does not satisfy the constraint 'PageProps'. Types of property 'params' are incompatible. Type '{ id: string; }' is missing the following properties from type 'Promise<any>': then, catch, finally, [Symbol.toSt`
    *   **Context:** This error occurs specifically in the dynamic plan page (`src/app/plan/[id]/page.tsx`). It seems related to type checking incompatibilities between `async` Server Components, dynamic route parameters, and Next.js's internal `PageProps` type in the current version (Next.js 15.3.1).
    *   **Attempts:** Various standard fixes (adjusting prop typing, using `NextPage` helper, simplifying prop access) have been attempted but the error persists, indicating a potentially deeper issue or edge case. 