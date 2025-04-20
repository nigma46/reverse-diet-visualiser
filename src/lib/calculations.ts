import { PlanInput, ActivityLevel, Sex, FullPlan } from '../types';

// Constants
const KCAL_PER_KG_FAT = 7700;
const WEEKS_INITIAL_MAINTENANCE = 1;
const WEEKS_POST_DEFICIT_MAINTENANCE = 2;
// Metabolic adaptation constants
const ADAPTATION_RATE = 0.1; // 10% adaptation per month (adjust as needed)
const MAX_ADAPTATION = 0.25; // Maximum 25% adaptation

// Activity Level Multipliers (Standard)
const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightlyActive: 1.375,
  moderatelyActive: 1.55,
  veryActive: 1.725,
  extraActive: 1.9,
};

// Calculate BMR using Mifflin-St Jeor Equation
function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex
): number {
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
}

// Calculate TDEE based on BMR and Activity Level
function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * activityMultipliers[activityLevel];
}

// Calculate metabolic adaptation factor based on weeks in deficit
function calculateAdaptationFactor(weeksInDeficit: number): number {
  // Convert weeks to months for calculation
  const monthsInDeficit = weeksInDeficit / 4.33;
  // Calculate adaptation percentage (capped at MAX_ADAPTATION)
  const adaptationPercentage = Math.min(ADAPTATION_RATE * monthsInDeficit, MAX_ADAPTATION);
  // Return factor to multiply with TDEE (e.g., 0.9 for 10% adaptation)
  return 1 - adaptationPercentage;
}

// Helper to add days to a date and format as YYYY-MM-DD
function addDaysAndFormat(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

// Main function to generate the full reverse diet plan
export function generatePlan(input: PlanInput): FullPlan {
  const plan: FullPlan = [];
  
  // Initialize currentDate from the input startDate
  // Ensure time component is zeroed out (start of the day)
  const startDateInput = new Date(input.startDate + 'T00:00:00Z');
  // Validate the parsed date before using it
  if (isNaN(startDateInput.getTime())) {
      console.error("Invalid start date provided:", input.startDate);
      // Handle invalid date - perhaps throw an error or default?
      // Throwing an error is safer to indicate bad input.
      throw new Error("Invalid start date format. Please use YYYY-MM-DD.");
  }
  // eslint-disable-next-line prefer-const -- currentDate object is mutated in loops, so let is semantically correct
  let currentDate = startDateInput;
  
  let currentWeekNumber = 1;
  let cumulativeWeightChangeKg = 0;
  let currentWeightKg = input.weightKg;
  let lastWeekCalories: number | null = null;

  const bmr = calculateBMR(
    input.weightKg,
    input.heightCm,
    input.age,
    input.sex
  );

  // --- Phase 1: Initial Maintenance ---
  const initialTdee = calculateTDEE(bmr, input.initialActivityLevel);
  const initialMaintenanceCalories = input.currentMaintenanceCalories;
  for (let i = 0; i < WEEKS_INITIAL_MAINTENANCE; i++) {
    const startDate = addDaysAndFormat(currentDate, 0);
    const endDate = addDaysAndFormat(currentDate, 6);
    const weeklyBalance = (initialMaintenanceCalories * 7) - (initialTdee * 7);
    const weeklyWeightChange = weeklyBalance / KCAL_PER_KG_FAT;
    cumulativeWeightChangeKg += weeklyWeightChange;
    currentWeightKg += weeklyWeightChange;

    plan.push({
      weekNumber: currentWeekNumber,
      startDate,
      endDate,
      phaseName: 'Initial Maintenance',
      targetCalories: Math.round(initialMaintenanceCalories),
      calorieChangeFromPreviousWeek: lastWeekCalories === null ? null : Math.round(initialMaintenanceCalories - lastWeekCalories),
      estimatedTdeeForPhase: Math.round(initialTdee),
      estimatedWeeklyBalance: Math.round(weeklyBalance),
      estimatedWeeklyWeightChangeKg: weeklyWeightChange,
      estimatedCumulativeWeightChangeKg: cumulativeWeightChangeKg,
      estimatedEndWeightKg: currentWeightKg,
    });
    lastWeekCalories = initialMaintenanceCalories;
    currentDate.setDate(currentDate.getDate() + 7);
    currentWeekNumber++;
  }

  // --- Phase 2: Calorie Deficit ---
  const deficitActivityLevel = input.deficitActivityLevel || input.initialActivityLevel;
  const baseTdee = calculateTDEE(bmr, deficitActivityLevel);
  const deficitCalories = input.currentMaintenanceCalories - input.dailyDeficitKcal;
  
  // Calculate deficit duration based on target weight loss
  // We need to account for metabolic adaptation in this calculation
  // For simplicity, we'll use the original calculation but add 20% more weeks
  // to account for the slowing effect of adaptation
  let deficitDurationWeeks = Math.ceil(
    (input.targetWeightLossKg * KCAL_PER_KG_FAT) / (input.dailyDeficitKcal * 7) * 1.2
  );
  
  // Ensure we have a minimum and maximum reasonable duration
  deficitDurationWeeks = Math.max(4, Math.min(deficitDurationWeeks, 52));

  for (let i = 0; i < deficitDurationWeeks; i++) {
    // Calculate adaptive TDEE based on weeks in deficit
    const adaptationFactor = calculateAdaptationFactor(i);
    const adaptedTdee = baseTdee * adaptationFactor;
    
    const startDate = addDaysAndFormat(currentDate, 0);
    const endDate = addDaysAndFormat(currentDate, 6);
    
    // Calculate weekly energy balance with adapted TDEE
    const weeklyBalance = (deficitCalories * 7) - (adaptedTdee * 7);
    
    // Calculate weekly weight change with a variable efficiency factor
    // As deficit increases in duration, the efficiency of fat loss decreases
    // and more weight comes from lean mass (which requires less energy)
    const efficiencyFactor = Math.max(0.85, 1 - (i * 0.005)); // Starts at 1.0, decreases by 0.5% per week
    const adjustedKcalPerKg = KCAL_PER_KG_FAT * efficiencyFactor;
    const weeklyWeightChange = weeklyBalance / adjustedKcalPerKg;
    
    cumulativeWeightChangeKg += weeklyWeightChange;
    currentWeightKg += weeklyWeightChange;

    plan.push({
      weekNumber: currentWeekNumber,
      startDate,
      endDate,
      phaseName: 'Calorie Deficit',
      targetCalories: Math.round(deficitCalories),
      calorieChangeFromPreviousWeek: lastWeekCalories === null ? null : Math.round(deficitCalories - lastWeekCalories),
      estimatedTdeeForPhase: Math.round(adaptedTdee), // Use adapted TDEE
      estimatedWeeklyBalance: Math.round(weeklyBalance),
      estimatedWeeklyWeightChangeKg: weeklyWeightChange,
      estimatedCumulativeWeightChangeKg: cumulativeWeightChangeKg,
      estimatedEndWeightKg: currentWeightKg,
    });
    lastWeekCalories = deficitCalories;
    currentDate.setDate(currentDate.getDate() + 7);
    currentWeekNumber++;
  }

   // --- Phase 3: Post-Deficit Maintenance ---
   const postDeficitActivityLevel = input.deficitActivityLevel || input.initialActivityLevel; // Assume same as deficit
   
   // Calculate new BMR based on current weight
   const postDeficitBmr = calculateBMR(
     currentWeightKg,
     input.heightCm,
     input.age,
     input.sex
   );
   
   // Calculate base TDEE with new BMR
   const basePostDeficitTdee = calculateTDEE(postDeficitBmr, postDeficitActivityLevel);
   const postDeficitCalories = deficitCalories; // Maintain deficit end calories

   for (let i = 0; i < WEEKS_POST_DEFICIT_MAINTENANCE; i++) {
     // During maintenance, adaptation gradually recovers
     // Start with adaptation from end of deficit and recover by 25% per week
     const remainingAdaptation = calculateAdaptationFactor(deficitDurationWeeks) * Math.pow(0.75, i);
     const recoveryFactor = 1 - (1 - remainingAdaptation) / 2; // Partial recovery
     const postDeficitTdee = basePostDeficitTdee * recoveryFactor;
     
     const startDate = addDaysAndFormat(currentDate, 0);
     const endDate = addDaysAndFormat(currentDate, 6);
     const weeklyBalance = (postDeficitCalories * 7) - (postDeficitTdee * 7);
     
     // Weight changes more easily immediately after deficit
     const postDeficitEfficiency = 0.9; // 90% efficiency (more responsive than long-term deficit)
     const weeklyWeightChange = weeklyBalance / (KCAL_PER_KG_FAT * postDeficitEfficiency);
     
     cumulativeWeightChangeKg += weeklyWeightChange;
     currentWeightKg += weeklyWeightChange;

     plan.push({
       weekNumber: currentWeekNumber,
       startDate,
       endDate,
       phaseName: 'Post-Deficit Maintenance',
       targetCalories: Math.round(postDeficitCalories),
       calorieChangeFromPreviousWeek: lastWeekCalories === null ? null : Math.round(postDeficitCalories - lastWeekCalories),
       estimatedTdeeForPhase: Math.round(postDeficitTdee),
       estimatedWeeklyBalance: Math.round(weeklyBalance),
       estimatedWeeklyWeightChangeKg: weeklyWeightChange,
       estimatedCumulativeWeightChangeKg: cumulativeWeightChangeKg,
       estimatedEndWeightKg: currentWeightKg,
     });
     lastWeekCalories = postDeficitCalories;
     currentDate.setDate(currentDate.getDate() + 7);
     currentWeekNumber++;
   }

  // --- Phase 4: Reverse Diet ---
  const reverseActivityLevel = input.reverseActivityLevel || input.initialActivityLevel;
  
  // Calculate new BMR based on current weight
  const reverseBmr = calculateBMR(
    currentWeightKg,
    input.heightCm,
    input.age,
    input.sex
  );
  
  // Calculate base TDEE with new BMR
  const baseReverseTdee = calculateTDEE(reverseBmr, reverseActivityLevel);
  let currentReverseCalories = postDeficitCalories;
  const reverseDurationWeeks = Math.ceil(
      (input.targetFinalMaintenanceCalories - currentReverseCalories) / input.weeklyReverseIncreaseKcal
  );

  for (let i = 0; i < reverseDurationWeeks; i++) {
    // Increase calories, but cap at target
    currentReverseCalories = Math.min(
        currentReverseCalories + input.weeklyReverseIncreaseKcal,
        input.targetFinalMaintenanceCalories
    );
    
    // During reverse dieting, adaptation continues to recover
    // Start with adaptation from end of post-deficit phase and recover more
    const weeksAfterDeficit = WEEKS_POST_DEFICIT_MAINTENANCE + i;
    const reverseRecoveryFactor = Math.min(1.0, 0.9 + (weeksAfterDeficit * 0.01)); // Gradually approaches 1.0
    const reverseTdee = baseReverseTdee * reverseRecoveryFactor;

    const startDate = addDaysAndFormat(currentDate, 0);
    const endDate = addDaysAndFormat(currentDate, 6);
    const weeklyBalance = (currentReverseCalories * 7) - (reverseTdee * 7);
    
    // Weight gain during reverse diet is more efficient than weight loss
    // This accounts for preferential fat storage when in surplus
    const surplusEfficiency = weeklyBalance > 0 ? 0.9 : 1.0; // 10% less efficient at storing fat
    const weeklyWeightChange = weeklyBalance / (KCAL_PER_KG_FAT * surplusEfficiency);
    
    cumulativeWeightChangeKg += weeklyWeightChange;
    currentWeightKg += weeklyWeightChange;

    plan.push({
      weekNumber: currentWeekNumber,
      startDate,
      endDate,
      phaseName: 'Reverse Diet',
      targetCalories: Math.round(currentReverseCalories),
      calorieChangeFromPreviousWeek: lastWeekCalories === null ? null : Math.round(currentReverseCalories - lastWeekCalories),
      estimatedTdeeForPhase: Math.round(reverseTdee),
      estimatedWeeklyBalance: Math.round(weeklyBalance),
      estimatedWeeklyWeightChangeKg: weeklyWeightChange,
      estimatedCumulativeWeightChangeKg: cumulativeWeightChangeKg,
      estimatedEndWeightKg: currentWeightKg,
    });
    lastWeekCalories = currentReverseCalories;
    currentDate.setDate(currentDate.getDate() + 7);
    currentWeekNumber++;

    // Stop if we've reached the target calories
    if (currentReverseCalories >= input.targetFinalMaintenanceCalories) {
        break;
    }
  }

  // --- Phase 5: New Maintenance ---
  // Add one week of the final maintenance phase to the plan
  const newMaintenanceActivityLevel = input.newMaintenanceActivityLevel || input.initialActivityLevel;
  
  // Calculate new BMR based on current weight
  const newMaintenanceBmr = calculateBMR(
    currentWeightKg,
    input.heightCm,
    input.age,
    input.sex
  );
  
  // Calculate fully recovered TDEE with new BMR (no adaptation at this point)
  const newMaintenanceTdee = calculateTDEE(newMaintenanceBmr, newMaintenanceActivityLevel);
  const newMaintenanceCalories = input.targetFinalMaintenanceCalories;

  const startDate = addDaysAndFormat(currentDate, 0);
  const endDate = addDaysAndFormat(currentDate, 6);
  const weeklyBalance = (newMaintenanceCalories * 7) - (newMaintenanceTdee * 7);
  const weeklyWeightChange = weeklyBalance / KCAL_PER_KG_FAT;
  cumulativeWeightChangeKg += weeklyWeightChange;
  currentWeightKg += weeklyWeightChange;

  plan.push({
      weekNumber: currentWeekNumber,
      startDate,
      endDate,
      phaseName: 'New Maintenance',
      targetCalories: Math.round(newMaintenanceCalories),
      calorieChangeFromPreviousWeek: lastWeekCalories === null ? null : Math.round(newMaintenanceCalories - lastWeekCalories),
      estimatedTdeeForPhase: Math.round(newMaintenanceTdee),
      estimatedWeeklyBalance: Math.round(weeklyBalance),
      estimatedWeeklyWeightChangeKg: weeklyWeightChange,
      estimatedCumulativeWeightChangeKg: cumulativeWeightChangeKg,
      estimatedEndWeightKg: currentWeightKg,
    });


  return plan;
} 