// import { kv } from '@vercel/kv'; // Remove old KV import
import { Redis } from '@upstash/redis'; // Import Upstash Redis client
import { FullPlan } from '@/types';
import { notFound } from 'next/navigation';
import PlanChart from '@/components/PlanChart';

// Initialize Upstash Redis client using fromEnv() to automatically read Vercel environment variables
const redis = Redis.fromEnv();
/*
// Previous manual initialization (removed as fromEnv is preferred)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
*/

// Define props structure according to Next.js 15 async page changes
interface PlanPageProps {
  params: Promise<{ id: string }>; // params is now a Promise
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>; // Also handle searchParams if needed
}

// Modify getPlanData to use Upstash Redis with robust parsing
async function getPlanData(id: string): Promise<FullPlan | null> {
  let planString: string | null | undefined = null; // Variable to hold the raw string
  try {
    // Get the raw value from Redis (should be a string)
    planString = await redis.get<string>(id);

    if (typeof planString !== 'string') {
      console.log(`Plan ID ${id}: Value retrieved from Redis was not a string (type: ${typeof planString}). Returning null.`);
      return null; // Value is null, undefined, or not a string
    }

    // Attempt to parse the string
    try {
      const plan: FullPlan = JSON.parse(planString);
      // Optional: Add basic validation if needed (e.g., check if it's an array)
      if (!Array.isArray(plan)) {
          console.error(`Plan ID ${id}: Parsed data is not an array.`);
          return null;
      }
      return plan; // Successfully parsed
    } catch (parseError) {
      // Log the specific parsing error and the problematic string
      console.error(`Plan ID ${id}: Failed to parse plan data retrieved from Redis. Error:`, parseError);
      console.error(`Plan ID ${id}: Problematic string data (first 500 chars):`, planString.substring(0, 500));
      return null; // Parsing failed
    }

  } catch (fetchError) {
    // Log errors during the actual fetch from Redis
    console.error(`Plan ID ${id}: Error fetching plan data from Upstash Redis:`, fetchError);
    return null;
  }
}

// Restore async default export function signature
export default async function PlanPage(props: PlanPageProps) {
  // Await the params promise before accessing its properties
  const params = await props.params;
  const planId = params.id;

  console.log(`Fetching plan data for ID: ${planId}`); // Add log
  const planData = await getPlanData(planId);
  console.log(`Fetched plan data: ${planData ? 'Found' : 'Not Found'}`); // Add log

  if (!planData) {
    console.log(`Plan ID ${planId} not found, rendering notFound().`); // Add log
    notFound();
  }

  // Restore calculations dependent on async data
  const today = new Date().toISOString().split('T')[0];
  const currentWeekIndex = planData.findIndex(week => today >= week.startDate && today <= week.endDate);
  const currentWeek = currentWeekIndex !== -1 ? planData[currentWeekIndex] : null;
  const nextWeek = currentWeekIndex !== -1 && currentWeekIndex + 1 < planData.length ? planData[currentWeekIndex + 1] : null;

  const totalWeeks = planData.length;
  const weeksRemainingTotal = currentWeek ? totalWeeks - currentWeek.weekNumber : totalWeeks;

  let weeksRemainingInPhase = 0;
  if (currentWeek) {
    for (let i = currentWeekIndex; i < planData.length; i++) {
      if (planData[i].phaseName === currentWeek.phaseName) {
        weeksRemainingInPhase++;
      } else {
        break;
      }
    }
  }

  return (
    <main className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Your Reverse Diet Plan</h1>

      <div className="mb-8 p-6 bg-white shadow-md rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Plan Overview</h2>
          {/* Restore dynamic URL display logic if needed, or keep simple planId */}
           <p className="mb-2">Your unique plan URL (bookmark this!): <code className="bg-gray-100 p-1 rounded text-sm">{typeof window !== 'undefined' ? window.location.href : `/plan/${planId}`}</code></p>
          <p>Total Plan Duration: {totalWeeks} weeks</p>
      </div>

      {/* Current Week Info Box */}
      {currentWeek && (
        <div className="mb-8 p-6 bg-blue-50 border border-blue-200 shadow-md rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Current Week ({currentWeek.weekNumber}) / Phase: {currentWeek.phaseName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* ... stats divs using restored currentWeek/nextWeek ... */}
               <div className="text-center p-4 bg-white rounded shadow">
                  <p className="text-sm text-gray-500">Target Calories (Daily)</p>
                  <p className="text-2xl font-bold">{currentWeek.targetCalories} kcal</p>
              </div>
              <div className="text-center p-4 bg-white rounded shadow">
                  <p className="text-sm text-gray-500">Upcoming Change</p>
                  <p className={`text-2xl font-bold ${nextWeek && nextWeek.calorieChangeFromPreviousWeek && nextWeek.calorieChangeFromPreviousWeek > 0 ? 'text-green-600' : nextWeek && nextWeek.calorieChangeFromPreviousWeek && nextWeek.calorieChangeFromPreviousWeek < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {nextWeek?.calorieChangeFromPreviousWeek ? `${nextWeek.calorieChangeFromPreviousWeek > 0 ? '+' : ''}${nextWeek.calorieChangeFromPreviousWeek} kcal` : 'None'}
                  </p>
              </div>
              <div className="text-center p-4 bg-white rounded shadow">
                  <p className="text-sm text-gray-500">Weeks Left in Phase</p>
                  <p className="text-2xl font-bold">{weeksRemainingInPhase -1}</p> {/* -1 because current week is included */} 
              </div>
              <div className="text-center p-4 bg-white rounded shadow">
                  <p className="text-sm text-gray-500">Weeks Left in Plan</p>
                  <p className="text-2xl font-bold">{weeksRemainingTotal -1}</p> {/* -1 because current week is included */} 
              </div>
          </div>
        </div>
      )}
      {/* Restore original logic for showing message when not in a current week */}
       {!currentWeek && (
           <div className="mb-8 p-6 bg-gray-50 border border-gray-200 shadow-md rounded-lg">
             <p className="text-center text-gray-600">Your planned start date ({planData[0].startDate}) is in the future, or the plan has completed.</p>
           </div>
      )}

      {/* Chart Section */}
      <div className="mb-8 p-6 bg-white shadow-md rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Plan Visualization</h2>
           <PlanChart planData={planData} currentWeekNumber={currentWeek?.weekNumber} />
      </div>

      {/* Full Plan Table (Optional) */}
      <div className="p-6 bg-white shadow-md rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Detailed Weekly Breakdown</h2>
          <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                   {/* ... table structure ... */}
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calories</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. TDEE</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Weight Change (kg)</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. End Weight (kg)</th>
                      </tr>
                  </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                      {planData.map((week) => (
                          <tr key={week.weekNumber} className={`${week.weekNumber === currentWeek?.weekNumber ? 'bg-blue-50' : ''}`}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{week.weekNumber}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{week.startDate} to {week.endDate}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{week.phaseName}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{week.targetCalories}</td>
                              <td className={`px-4 py-2 whitespace-nowrap text-sm ${week.calorieChangeFromPreviousWeek && week.calorieChangeFromPreviousWeek > 0 ? 'text-green-600' : week.calorieChangeFromPreviousWeek && week.calorieChangeFromPreviousWeek < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                                  {week.calorieChangeFromPreviousWeek ? `${week.calorieChangeFromPreviousWeek > 0 ? '+' : ''}${week.calorieChangeFromPreviousWeek}` : '-'}
                               </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{week.estimatedTdeeForPhase}</td>
                              <td className={`px-4 py-2 whitespace-nowrap text-sm ${week.estimatedWeeklyWeightChangeKg < -0.01 ? 'text-red-600' : week.estimatedWeeklyWeightChangeKg > 0.01 ? 'text-green-600' : 'text-gray-700'}`}>{week.estimatedWeeklyWeightChangeKg.toFixed(2)}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{week.estimatedEndWeightKg.toFixed(2)}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </main>
  );
}
// Removed export default PlanPage at the end as it's now default export function