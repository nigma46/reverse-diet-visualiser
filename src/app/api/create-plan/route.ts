import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { generatePlan } from '@/lib/calculations';
import { PlanInput, FullPlan } from '@/types';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  console.log("--- Create Plan API Route START ---");
  try {
    const inputData: PlanInput = await request.json();
    console.log("Received input data:", JSON.stringify(inputData, null, 2));

    // --- Basic Input Validation (Expand as needed) ---
    if (
      !inputData.age || inputData.age <= 0 ||
      !inputData.weightKg || inputData.weightKg <= 0 ||
      !inputData.heightCm || inputData.heightCm <= 0 ||
      !inputData.sex ||
      !inputData.currentMaintenanceCalories || inputData.currentMaintenanceCalories <= 0 ||
      !inputData.initialActivityLevel ||
      !inputData.targetWeightLossKg || inputData.targetWeightLossKg < 0 || // Allow 0 target loss
      !inputData.dailyDeficitKcal || inputData.dailyDeficitKcal <= 0 ||
      !inputData.targetFinalMaintenanceCalories || inputData.targetFinalMaintenanceCalories <= 0 ||
      !inputData.weeklyReverseIncreaseKcal || inputData.weeklyReverseIncreaseKcal <= 0
    ) {
      console.warn("Input validation failed:", JSON.stringify(inputData, null, 2));
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }
    // Add more specific validation (e.g., ranges, enum checks) here
    console.log("Input data passed validation.");

    // --- Generate Plan ---
    console.log("Calling generatePlan...");
    const plan: FullPlan = generatePlan(inputData);
    // Log only first few entries if plan is long
    console.log("Generated plan (first few entries):", JSON.stringify(plan?.slice(0, 3), null, 2));

    if (!plan || plan.length === 0) {
      console.error("Plan generation returned empty or null plan.");
      throw new Error('Plan generation failed');
    }
    console.log(`Generated plan with ${plan.length} weeks.`);

    // --- Generate Unique ID and Store Plan ---
    const planId = nanoid(10); // Generate a 10-character unique ID
    console.log(`Generated plan ID: ${planId}`);

    // Store the plan in Vercel KV. TTL can be added if needed (e.g., 1 year)
    // const oneYearInSeconds = 365 * 24 * 60 * 60;
    console.log(`Attempting to store plan with ID ${planId} in KV...`);
    await kv.set(planId, plan); //, { ex: oneYearInSeconds });
    console.log(`Successfully stored plan with ID ${planId} in KV.`);

    // --- Return Success Response --- 
    console.log("--- Create Plan API Route SUCCESS ---");
    return NextResponse.json({ planId: planId }, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("--- Create Plan API Route ERROR ---");
    console.error("Error creating plan:", error);
    // Removed unused errorMessage variable assignment
    // let errorMessage = 'Internal Server Error';
    // if (error instanceof Error) {
    //     errorMessage = error.message;
    // }
    // Avoid leaking detailed internal errors to the client
    return NextResponse.json({ error: 'Failed to create plan.' }, { status: 500 });
  }
} 