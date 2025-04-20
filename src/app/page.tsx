'use client'; // Needed for form handling and state

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlanInput, Sex, ActivityLevel } from '@/types';

// Define options for select dropdowns
const sexOptions: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const activityLevelOptions: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
  { value: 'lightlyActive', label: 'Lightly Active', description: 'Light exercise/sports 1-3 days/week' },
  { value: 'moderatelyActive', label: 'Moderately Active', description: 'Moderate exercise/sports 3-5 days/week' },
  { value: 'veryActive', label: 'Very Active', description: 'Hard exercise/sports 6-7 days a week' },
  { value: 'extraActive', label: 'Extra Active', description: 'Very hard exercise/sports & physical job' },
];

// Helper component for input fields
interface InputFieldProps {
    label: string;
    id: keyof PlanInput;
    type: string;
    required?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    value?: string | number;
    min?: number;
    step?: number;
    placeholder?: string;
    children?: React.ReactNode; // For select options
    description?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, id, type, required, onChange, value, min, step, placeholder, children, description }) => (
    <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {type === 'select' ? (
            <select
                id={id}
                name={id}
                required={required}
                onChange={onChange}
                value={value || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
                {children}
            </select>
        ) : (
            <input
                type={type}
                id={id}
                name={id}
                required={required}
                onChange={onChange}
                value={value || ''}
                min={min}
                step={step}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
        )}
         {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
    </div>
);

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get tomorrow's date in YYYY-MM-DD format for the default start date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStartDate = tomorrow.toISOString().split('T')[0];

  const [formData, setFormData] = useState<Partial<PlanInput>>({
      sex: 'female', // Default example
      initialActivityLevel: 'lightlyActive', // Default example
      startDate: defaultStartDate // Default start date to tomorrow
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    // --- More specific validation ---
    const requiredFields: (keyof PlanInput)[] = [
        'age', 'weightKg', 'heightCm', 'sex', 'currentMaintenanceCalories',
        'initialActivityLevel', 'targetWeightLossKg', 'dailyDeficitKcal',
        'targetFinalMaintenanceCalories', 'weeklyReverseIncreaseKcal',
        'startDate' // Added startDate to required fields
    ];

    // Check for missing fields (not present, null, or undefined) or invalid numbers (NaN)
    const missingFields = requiredFields.filter(field =>
        !(field in formData) || // Field is not present
        formData[field] === null || // Field is explicitly null
        formData[field] === undefined || // Field is undefined (e.g., cleared number input)
        formData[field] === '' || // Added check for empty string (relevant for date input)
        (typeof formData[field] === 'number' && isNaN(Number(formData[field]))) // Field is NaN
    );

    // Add validation for start date format if needed (basic check covered by required)
    // Example: if (formData.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(formData.startDate)) { ... }

    if (missingFields.length > 0) {
      setError(`Please fill out all required fields: ${missingFields.join(', ')}`);
      setIsLoading(false);
      return;
    }

    try {
      // Optional fields that are empty should be removed or set to null/undefined
      // before sending to the API if the backend expects them to be absent.
      const apiPayload = { ...formData };
      if (!apiPayload.deficitActivityLevel) delete apiPayload.deficitActivityLevel;
      if (!apiPayload.reverseActivityLevel) delete apiPayload.reverseActivityLevel;
      if (!apiPayload.newMaintenanceActivityLevel) delete apiPayload.newMaintenanceActivityLevel;

      const response = await fetch('/api/create-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create plan');
      }

      const { planId } = await response.json();
      if (planId) {
        router.push(`/plan/${planId}`);
      } else {
        throw new Error('No plan ID received from server');
      }

    } catch (err: unknown) {
      if (err instanceof Error) {
          setError(err.message);
      } else {
          setError('An unexpected error occurred');
      }
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    let processedValue: string | number | undefined = value;
    // Keep date type as string, process numbers
    if (type === 'number') {
      processedValue = value === '' ? undefined : Number(value);
    }

    setFormData(prev => ({
        ...prev,
        [name]: processedValue
    }));
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Reverse Diet Planner</h1>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-white p-6 md:p-10 shadow-lg rounded-xl border border-gray-200">

        {/* --- Section 1: Personal Details --- */}
        <fieldset className="mb-8 border border-gray-300 p-4 rounded-lg">
            <legend className="text-lg font-semibold px-2 mb-3 text-gray-800">Your Details</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <InputField label="Age" id="age" type="number" required min={1} onChange={handleChange} value={formData.age} />
                <InputField label="Sex" id="sex" type="select" required onChange={handleChange} value={formData.sex}>
                    {sexOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </InputField>
                <InputField label="Weight (kg)" id="weightKg" type="number" required min={1} step={0.1} onChange={handleChange} value={formData.weightKg} />
                <InputField label="Height (cm)" id="heightCm" type="number" required min={1} onChange={handleChange} value={formData.heightCm} />
            </div>
             <InputField
                label="Current Estimated Maintenance Calories (kcal/day)"
                id="currentMaintenanceCalories"
                type="number"
                required
                min={1}
                onChange={handleChange}
                value={formData.currentMaintenanceCalories}
                description="Your best estimate of the daily calories needed to maintain your current weight."
            />
            <InputField
                label="Plan Start Date"
                id="startDate"
                type="date" // Use date input type
                required
                onChange={handleChange}
                value={formData.startDate}
                description="The date you want the plan to begin."
            />
        </fieldset>

        {/* --- Section 2: Activity Levels --- */}
        <fieldset className="mb-8 border border-gray-300 p-4 rounded-lg">
            <legend className="text-lg font-semibold px-2 mb-3 text-gray-800">Activity Levels</legend>
            <p className="text-sm text-gray-600 mb-4">Select your typical activity level. You can override this for specific phases below if needed.</p>
            <InputField label="Initial / Typical Activity Level" id="initialActivityLevel" type="select" required onChange={handleChange} value={formData.initialActivityLevel}>
                {activityLevelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label} ({opt.description})</option>)}
            </InputField>
            <h3 className="text-md font-medium mt-4 mb-2 text-gray-700">Optional Phase Overrides:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                 <InputField label="Deficit Phase" id="deficitActivityLevel" type="select" onChange={handleChange} value={formData.deficitActivityLevel}>
                     <option value="">Use Initial</option>
                     {activityLevelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                 </InputField>
                 <InputField label="Reverse Phase" id="reverseActivityLevel" type="select" onChange={handleChange} value={formData.reverseActivityLevel}>
                     <option value="">Use Initial</option>
                     {activityLevelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                 </InputField>
                 <InputField label="New Maintenance" id="newMaintenanceActivityLevel" type="select" onChange={handleChange} value={formData.newMaintenanceActivityLevel}>
                    <option value="">Use Initial</option>
                     {activityLevelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                 </InputField>
            </div>
        </fieldset>

        {/* --- Section 3: Diet Goals --- */}
        <fieldset className="mb-8 border border-gray-300 p-4 rounded-lg">
            <legend className="text-lg font-semibold px-2 mb-3 text-gray-800">Diet Goals</legend>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                 <InputField
                    label="Target Weight Loss During Deficit (kg)"
                    id="targetWeightLossKg"
                    type="number"
                    required
                    min={0} // Allow 0 for no deficit phase
                    step={0.1}
                    onChange={handleChange}
                    value={formData.targetWeightLossKg}
                />
                 <InputField
                    label="Desired Daily Deficit (kcal)"
                    id="dailyDeficitKcal"
                    type="number"
                    required
                    min={1}
                    onChange={handleChange}
                    value={formData.dailyDeficitKcal}
                    description="How many calories below maintenance to eat daily during the deficit (e.g., 300-500)."
                />
                 <InputField
                    label="Target Final Maintenance Calories (kcal/day)"
                    id="targetFinalMaintenanceCalories"
                    type="number"
                    required
                    min={1}
                    onChange={handleChange}
                    value={formData.targetFinalMaintenanceCalories}
                    description="The daily calorie goal for your new maintenance phase after the reverse."
                />
                 <InputField
                    label="Weekly Calorie Increase During Reverse (kcal)"
                    id="weeklyReverseIncreaseKcal"
                    type="number"
                    required
                    min={1}
                    onChange={handleChange}
                    value={formData.weeklyReverseIncreaseKcal}
                    description="How many calories to add per week during the reverse diet (e.g., 50-100)."
                />
            </div>
        </fieldset>

        {error && <p className="text-red-600 mb-4 p-3 bg-red-50 border border-red-200 rounded text-center font-medium">Error: {error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 px-6 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
        >
          {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Plan...
                </>
            ) : (
                'Create My Plan'
            )}
        </button>
      </form>
    </main>
  );
} 