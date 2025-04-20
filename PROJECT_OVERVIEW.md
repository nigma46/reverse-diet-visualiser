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
*   **Data Storage:** Vercel KV (Key-Value store)
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
├── .env.local          # Local environment variables (e.g., for KV dev)
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
3.  **Install:** `npm install`
4.  **Vercel KV Setup (Local):**
    *   Install Vercel CLI: `npm i -g vercel`
    *   Link project: `vercel link` (follow prompts)
    *   Pull environment variables: `vercel env pull .env.local` (This requires a Vercel KV store linked to the project - see Deployment section).
5.  **Run Development Server:** `npm run dev`
6.  **Access:** Open `http://localhost:3000` in your browser.

## 6. Deployment

The application is intended for deployment on Vercel.

1.  Push code to a Git provider (GitHub, GitLab, Bitbucket).
2.  Import the Git repository into a new Vercel project.
3.  **Important:** Ensure the **Root Directory** in Vercel project settings points to `reverse-diet-visualiser` if the repo root is the parent folder.
4.  Go to the project's **Settings -> Storage** tab on Vercel.
5.  Connect a **KV Store** (create a new one if needed).
6.  Vercel will automatically set the required `KV_URL`, `KV_REST_API_URL`, etc., environment variables.
7.  Trigger a deployment.

## 7. Current Status & Known Issues

*   **Core functionality** (form, plan generation, basic display, charting) is implemented.
*   **Known Issue:** The project is currently experiencing a **build error** when deploying or running `npm run build` locally.
    *   **Error:** `Type error: Type 'PlanPageProps' does not satisfy the constraint 'PageProps'. Types of property 'params' are incompatible. Type '{ id: string; }' is missing the following properties from type 'Promise<any>': then, catch, finally, [Symbol.toSt`
    *   **Context:** This error occurs specifically in the dynamic plan page (`src/app/plan/[id]/page.tsx`). It seems related to type checking incompatibilities between `async` Server Components, dynamic route parameters, and Next.js's internal `PageProps` type in the current version (Next.js 15.3.1).
    *   **Attempts:** Various standard fixes (adjusting prop typing, using `NextPage` helper, simplifying prop access) have been attempted but the error persists, indicating a potentially deeper issue or edge case. 