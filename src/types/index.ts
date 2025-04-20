export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary' // Little to no exercise
  | 'lightlyActive' // Light exercise/sports 1-3 days/week
  | 'moderatelyActive' // Moderate exercise/sports 3-5 days/week
  | 'veryActive' // Hard exercise/sports 6-7 days a week
  | 'extraActive'; // Very hard exercise/sports & physical job

export interface PlanInput {
  // Personal Stats
  age: number;
  weightKg: number;
  heightCm: number;
  sex: Sex;
  currentMaintenanceCalories: number;
  startDate: string; // Added: YYYY-MM-DD format

  // Activity Levels (Optional overrides)
  initialActivityLevel: ActivityLevel;
  deficitActivityLevel?: ActivityLevel;
  reverseActivityLevel?: ActivityLevel;
  newMaintenanceActivityLevel?: ActivityLevel;

  // Goals
  targetWeightLossKg: number;
  dailyDeficitKcal: number; // e.g., 500
  targetFinalMaintenanceCalories: number;
  weeklyReverseIncreaseKcal: number; // e.g., 100
}

export interface WeeklyPlan {
  weekNumber: number;
  startDate: string; // ISO Date string (YYYY-MM-DD)
  endDate: string; // ISO Date string (YYYY-MM-DD)
  phaseName:
    | 'Initial Maintenance'
    | 'Calorie Deficit'
    | 'Post-Deficit Maintenance'
    | 'Reverse Diet'
    | 'New Maintenance';
  targetCalories: number; // Daily target
  calorieChangeFromPreviousWeek: number | null; // null for week 1
  estimatedTdeeForPhase: number; // Estimated daily TDEE for this week's phase
  estimatedWeeklyBalance: number; // (Target * 7) - (Est. TDEE * 7)
  estimatedWeeklyWeightChangeKg: number;
  estimatedCumulativeWeightChangeKg: number;
  estimatedEndWeightKg: number; // Initial Weight + Cumulative Change
}

export type FullPlan = WeeklyPlan[]; 