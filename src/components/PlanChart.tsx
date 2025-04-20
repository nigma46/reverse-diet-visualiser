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
    Filler,
    ChartOptions,
    ChartData,
    Plugin
} from 'chart.js';
import { FullPlan } from '@/types';

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

// Function to get phase-specific colors
const getPhaseColor = (phaseName: string): string => {
  switch (phaseName) {
    case 'Initial Maintenance':
      return 'rgba(54, 162, 235, 0.1)'; // Light blue
    case 'Calorie Deficit':
      return 'rgba(255, 99, 132, 0.1)'; // Light red
    case 'Post-Deficit Maintenance':
      return 'rgba(255, 159, 64, 0.1)'; // Light orange
    case 'Reverse Diet':
      return 'rgba(75, 192, 192, 0.1)'; // Light teal
    case 'New Maintenance':
      return 'rgba(153, 102, 255, 0.1)'; // Light purple
    default:
      return 'rgba(201, 203, 207, 0.1)'; // Light grey
  }
};

const PlanChart: React.FC<PlanChartProps> = ({ planData, currentWeekNumber }) => {
    // Create extended data to show 8 more weeks beyond plan end
    const extendedPlanData = [...planData];
    
    // Get the last week's data
    const lastWeek = planData[planData.length - 1];
    const phase = lastWeek.phaseName;
    
    // Add 8 more weeks with the same phase and values as the last week
    for (let i = 1; i <= 8; i++) {
        const weekNumber = lastWeek.weekNumber + i;
        
        // Calculate new dates (add 7 days for each week)
        const startDate = new Date(lastWeek.endDate);
        startDate.setDate(startDate.getDate() + 1 + (i-1) * 7);
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        
        // Format dates as YYYY-MM-DD
        const formatDate = (date: Date) => {
            return date.toISOString().split('T')[0];
        };
        
        extendedPlanData.push({
            ...lastWeek,
            weekNumber,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            calorieChangeFromPreviousWeek: 0
        });
    }

    const labels = extendedPlanData.map(week => `Week ${week.weekNumber}`);

    // Create plugin for phase background shading
    const phaseBackgroundPlugin: Plugin<'line'> = {
        id: 'phaseBackground',
        beforeDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea) return;
            
            let currentPhase = '';
            let startX = chartArea.left;
            
            // Go through each week and draw background colors for phases
            extendedPlanData.forEach((week, index) => {
                // If phase changes or it's the last data point, draw the previous phase area
                if (week.phaseName !== currentPhase || index === extendedPlanData.length - 1) {
                    if (currentPhase !== '') {
                        // Calculate end X position (either current data point or chart right edge)
                        const endX = index === extendedPlanData.length - 1 
                            ? chartArea.right 
                            : scales.x.getPixelForValue(index - 0.5); // Position between points
                        
                        // Draw the background
                        ctx.fillStyle = getPhaseColor(currentPhase);
                        ctx.fillRect(startX, chartArea.top, endX - startX, chartArea.height);
                        
                        // Add a vertical line between phases (optional)
                        if (index < extendedPlanData.length - 1) {
                            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(endX, chartArea.top);
                            ctx.lineTo(endX, chartArea.bottom);
                            ctx.stroke();
                        }
                    }
                    
                    // Start a new phase
                    currentPhase = week.phaseName;
                    startX = index === 0 
                        ? chartArea.left 
                        : scales.x.getPixelForValue(index - 0.5); // Position between points
                }
            });

            // Add phase labels (optional)
            let labelPhase = '';
            let labelStartX = chartArea.left;
            let labelMiddleX = chartArea.left;
            
            extendedPlanData.forEach((week, index) => {
                if (week.phaseName !== labelPhase || index === extendedPlanData.length - 1) {
                    if (labelPhase !== '') {
                        const labelEndX = index === extendedPlanData.length - 1 
                            ? chartArea.right 
                            : scales.x.getPixelForValue(index - 0.5);
                        
                        // Calculate the middle of the phase for label placement
                        labelMiddleX = labelStartX + (labelEndX - labelStartX) / 2;
                        
                        // Draw phase label at the top of the chart
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.font = '10px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(labelPhase, labelMiddleX, chartArea.top - 5);
                    }
                    
                    labelPhase = week.phaseName;
                    labelStartX = index === 0 
                        ? chartArea.left 
                        : scales.x.getPixelForValue(index - 0.5);
                }
            });
        }
    };

    const chartData: ChartData<'line'> = {
        labels,
        datasets: [
            {
                label: 'Target Calories (kcal)',
                data: extendedPlanData.map(week => week.targetCalories),
                borderColor: 'rgb(54, 162, 235)', // Blue
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                yAxisID: 'y', // Use the primary Y axis
                tension: 0.1,
                pointRadius: (ctx) => ctx.dataIndex + 1 === currentWeekNumber ? 6 : 3, // Highlight current week point
                pointBackgroundColor: (ctx) => ctx.dataIndex + 1 === currentWeekNumber ? 'rgb(54, 162, 235)' : 'rgba(54, 162, 235, 0.7)',
            },
            {
                label: 'Estimated Weight (kg)',
                data: extendedPlanData.map(week => parseFloat(week.estimatedEndWeightKg.toFixed(1))), // Round for display
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
                        // Ensure extendedPlanData[index] exists before accessing properties
                        const weekData = extendedPlanData[index];
                        if (!weekData) return ''; 
                        return `Week ${weekData.weekNumber} (${weekData.phaseName})`;
                    },
                }
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Week of Plan'
                },
                grid: {
                    display: true,
                    drawOnChartArea: false, // only draw grid lines at tick marks
                }
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
                suggestedMin: Math.min(...extendedPlanData.map(w => w.targetCalories)) - 200,
                suggestedMax: Math.max(...extendedPlanData.map(w => w.targetCalories)) + 200,
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
                suggestedMin: Math.min(...extendedPlanData.map(w => w.estimatedEndWeightKg)) - 3,
                suggestedMax: Math.max(...extendedPlanData.map(w => w.estimatedEndWeightKg)) + 3,
            },
        },
    };

    return (
        <div style={{ height: '500px' }}> {/* Increased height for better visualization */}
            <Line 
                options={options} 
                data={chartData} 
                plugins={[phaseBackgroundPlugin]} 
            />
        </div>
    );
};

export default PlanChart; 