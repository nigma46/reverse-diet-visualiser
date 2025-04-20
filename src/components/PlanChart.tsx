'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler, // For filling area under line or between lines
    ChartOptions,
    ChartData
} from 'chart.js';
import { FullPlan, WeeklyPlan } from '@/types';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface PlanChartProps {
  planData: FullPlan;
  currentWeekNumber?: number;
}

// Helper to get phase background color
const getPhaseBackgroundColor = (phaseName: WeeklyPlan['phaseName']): string => {
    switch (phaseName) {
        case 'Initial Maintenance': return 'rgba(200, 200, 200, 0.1)'; // Light grey
        case 'Calorie Deficit': return 'rgba(255, 99, 132, 0.1)'; // Light red
        case 'Post-Deficit Maintenance': return 'rgba(255, 159, 64, 0.1)'; // Light orange
        case 'Reverse Diet': return 'rgba(75, 192, 192, 0.1)'; // Light teal
        case 'New Maintenance': return 'rgba(54, 162, 235, 0.1)'; // Light blue
        default: return 'rgba(0, 0, 0, 0)';
    }
};

const PlanChart: React.FC<PlanChartProps> = ({ planData, currentWeekNumber }) => {

    const labels = planData.map(week => `Week ${week.weekNumber}`);

    const chartData: ChartData<'line'> = {
        labels,
        datasets: [
            {
                label: 'Target Calories (kcal)',
                data: planData.map(week => week.targetCalories),
                borderColor: 'rgb(54, 162, 235)', // Blue
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                yAxisID: 'y', // Use the primary Y axis
                tension: 0.1,
                pointRadius: (ctx) => ctx.dataIndex + 1 === currentWeekNumber ? 6 : 3, // Highlight current week point
                pointBackgroundColor: (ctx) => ctx.dataIndex + 1 === currentWeekNumber ? 'rgb(54, 162, 235)' : 'rgba(54, 162, 235, 0.7)',
            },
            {
                label: 'Estimated Weight (kg)',
                data: planData.map(week => parseFloat(week.estimatedEndWeightKg.toFixed(1))), // Round for display
                borderColor: 'rgb(255, 99, 132)', // Red
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                yAxisID: 'y1', // Use the secondary Y axis
                tension: 0.1,
                pointRadius: (ctx) => ctx.dataIndex + 1 === currentWeekNumber ? 6 : 3,
                pointBackgroundColor: (ctx) => ctx.dataIndex + 1 === currentWeekNumber ? 'rgb(255, 99, 132)' : 'rgba(255, 99, 132, 0.7)',
            },
        ],
    };

    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false, // Allow chart to fill container height
        interaction: {
            mode: 'index' as const, // Show tooltips for all datasets at the hovered index
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Calorie & Weight Progression',
            },
            tooltip: {
                callbacks: {
                    // Add phase name to tooltip
                    title: (tooltipItems) => {
                        const index = tooltipItems[0].dataIndex;
                        return `Week ${planData[index].weekNumber} (${planData[index].phaseName})`;
                    },
                    // You can customize label formatting here if needed
                }
            },
             // Basic phase background coloring (more advanced needs plugins)
             // This is a simplified approach, might not be perfect for transitions
             // background color plugin would be better for distinct phase blocks
            // filler: {
            //     propagate: true,
            // },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Week of Plan'
                },
            },
            y: { // Primary Y Axis (Calories)
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                title: {
                    display: true,
                    text: 'Daily Calories (kcal)',
                },
                // Suggest min/max based on data range + padding
                 suggestedMin: Math.min(...planData.map(w => w.targetCalories)) - 100,
                 suggestedMax: Math.max(...planData.map(w => w.targetCalories)) + 100,
            },
            y1: { // Secondary Y Axis (Weight)
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                title: {
                    display: true,
                    text: 'Est. Weight (kg)',
                },
                // Align grid lines - may or may not be desired
                grid: {
                    drawOnChartArea: false, // only want the grid lines for one axis to show
                },
                // Suggest min/max based on data range + padding
                 suggestedMin: Math.min(...planData.map(w => w.estimatedEndWeightKg)) - 2,
                 suggestedMax: Math.max(...planData.map(w => w.estimatedEndWeightKg)) + 2,
            },
        },
        // --- Attempt at background shading per phase (Basic) ---
        // Note: This approach colors the *points*, not the background area between grid lines.
        // A dedicated plugin (like chartjs-plugin-annotation) is better for block shading.
        // elements: {
        //     point: {
        //         backgroundColor: (ctx) => {
        //             const weekData = planData[ctx.dataIndex];
        //             if (!weekData) return 'grey'; 
        //             // Keep highlight for current week
        //             if (ctx.dataIndex + 1 === currentWeekNumber) {
        //                  return ctx.datasetIndex === 0 ? 'rgb(54, 162, 235)' : 'rgb(255, 99, 132)';
        //             }
        //             return getPhaseBackgroundColor(weekData.phaseName).replace('0.1', '0.7'); // Use slightly darker for points
        //         },
        //     }
        // }
    };

    return (
        <div style={{ height: '400px' }}> {/* Set container height for maintainAspectRatio: false */}
            <Line options={options} data={chartData} />
        </div>
    );
};

export default PlanChart; 