# Reverse Diet Visualiser - Project Overview

> **IMPORTANT**: This application is located in the `reverse-diet-visualiser` subdirectory of this repository, not in the parent directory. All commands should be run from inside the `reverse-diet-visualiser` directory.

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
        *   Background shading that color-codes different diet phases.
        *   Extended timeline showing 8 weeks beyond the plan end date.
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

## 7. Advanced Weight Loss Modeling

The application implements a sophisticated weight loss prediction model that accounts for real-world metabolic factors:

### Metabolic Adaptation
* **Implementation:** The model includes a `calculateAdaptationFactor` function that calculates decreasing metabolic rate during extended calorie restriction.
* **Parameters:** 
  * `ADAPTATION_RATE = 0.1` (10% adaptation per month)
  * `MAX_ADAPTATION = 0.25` (Maximum 25% adaptation cap)
* **Mechanism:** As dieting continues, the body gradually reduces energy expenditure to conserve resources. This metabolic adaptation is modeled as a percentage reduction in TDEE that increases with time spent in a deficit.

### Adaptive TDEE Calculation
* **Base TDEE:** Calculated using the standard BMR formula (Mifflin-St Jeor) and activity multipliers.
* **Adaptation Factor:** During deficit phases, TDEE is multiplied by a decreasing factor based on weeks spent in deficit.
* **Recovery:** During post-deficit phases (maintenance, reverse diet), adaptation gradually recovers at different rates depending on the phase.

### Variable Energy Efficiency
* **Fat Loss Efficiency:** Efficiency of calorie deficit to fat loss conversion decreases over time:
  * `efficiencyFactor = Math.max(0.85, 1 - (weekNumber * 0.005))`
  * Starts at 100% efficiency, decreases by 0.5% per week, with a minimum of 85%
* **Surplus Efficiency:** The body is more efficient at storing fat than losing it:
  * 90% efficiency for fat storage during surplus periods (reverse diet)
  * This accounts for the asymmetry in weight gain vs. loss processes

### Phase-Specific Calculations
* **Deficit Phase:** 
  * Duration calculation includes 20% extra time to account for adaptation
  * Weekly weight change calculation uses a decreasing efficiency factor
* **Post-Deficit Maintenance:**
  * Uses current weight for BMR calculation rather than initial weight
  * Models gradual recovery from adaptation (25% recovery per week)
* **Reverse Diet:**
  * Uses current weight for BMR calculation
  * Models continuing adaptation recovery
  * Accounts for preferential fat storage in surplus with a 90% efficiency factor
* **New Maintenance:**
  * Uses final weight for BMR calculation
  * Assumes full recovery from metabolic adaptation

### Scientific Basis
This modeling approach is based on research showing that:
1. Metabolic rate decreases beyond what would be predicted by weight loss alone
2. Efficiency of weight loss decreases over time during extended deficits
3. The body preferentially stores energy as fat when returning to surplus after a deficit
4. Metabolic adaptation requires time to fully recover after a deficit ends

These calculations provide users with more realistic expectations for their weight loss, maintenance, and reverse dieting journey compared to simple linear calorie-to-weight models.

## 8. Current Status & Known Issues

*   **Core functionality** (form with start date, plan generation, basic display, charting) is implemented.
*   **Data Storage:** Uses Upstash Redis via Vercel Marketplace.
*   **Fixed Issue:** ~~Plans are successfully created and stored via the API route (`create-plan/route.ts`), but the plan display page (`plan/[id]/page.tsx`) fails to retrieve/parse the data correctly, resulting in a 404.~~ This issue has been resolved by updating the Redis client initialization to explicitly use the Vercel KV environment variables and modifying the retrieval code to handle both string and object types returned from Redis.
*   **Data Visualization:** The chart now includes:
    * Phase background shading to visually distinguish different phases of the diet plan
    * Extended timeline showing 8 weeks beyond the plan end date
    * Improved text contrast for better readability
*   Minor browser console warnings related to CSS parsing (`-webkit-text-size-adjust`, `-moz-osx-font-smoothing`) and font preloading exist but are unrelated to core functionality issues. 