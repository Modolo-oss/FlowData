/**
 * Chart Generator from Data Insights
 * Aggregates insights from workers and generates chart data from actual CSV data
 */

import { TrainUpdate } from "../types.js";

interface DataInsight {
	num_samples: number;
	columns: string[];
	numeric_columns?: string[];
	categorical_columns?: string[];
	statistics?: Record<string, any>;
	correlations?: Array<{ x: string; y: string; value: number }>;
	clusters?: Array<{ x: number; y: number; cluster: string; label: string }>;
	trends?: Array<{ metric: string; over: string; direction: string; change: number; data_points: any[] }>;
	outliers?: Array<{ column: string; row: number; value: number; deviation: number }>;
}

interface AggregatedInsights {
	num_samples: number;
	columns: string[];
	numeric_columns: string[];
	categorical_columns: string[];
	statistics: Record<string, any>;
	correlations: Array<{ x: string; y: string; value: number }>;
	clusters: Array<{ x: number; y: number; cluster: string; label: string }>;
	trends: Array<{ metric: string; over: string; direction: string; change: number; data_points: any[] }>;
	outliers: Array<{ column: string; row: number; value: number; deviation: number }>;
}

interface ChartData {
	correlationMatrix: Array<{ x: string; y: string; value: number }>;
	trends: Array<{ date: string; value: number }>;
	clusters: Array<{ x: number; y: number; cluster: string; label: string }>;
	summary: {
		total_samples: number;
		numeric_columns: number;
		categorical_columns: number;
		strong_correlations: number;
		outliers_count: number;
	};
}

/**
 * Aggregate data insights from multiple workers
 */
export function aggregateDataInsights(insights: DataInsight[]): AggregatedInsights {
	if (!insights || insights.length === 0) {
		return {
			num_samples: 0,
			columns: [],
			numeric_columns: [],
			categorical_columns: [],
			statistics: {},
			correlations: [],
			clusters: [],
			trends: [],
			outliers: [],
		};
	}

	// Aggregate total samples
	const total_samples = insights.reduce((sum, insight) => sum + (insight.num_samples || 0), 0);

	// Combine all columns (unique)
	const allColumns = new Set<string>();
	const allNumericColumns = new Set<string>();
	const allCategoricalColumns = new Set<string>();

	insights.forEach(insight => {
		(insight.columns || []).forEach(col => allColumns.add(col));
		(insight.numeric_columns || []).forEach(col => allNumericColumns.add(col));
		(insight.categorical_columns || []).forEach(col => allCategoricalColumns.add(col));
	});

	// Aggregate statistics (merge from all workers)
	const aggregatedStats: Record<string, any> = {};
	insights.forEach(insight => {
		if (insight.statistics) {
			Object.entries(insight.statistics).forEach(([col, stats]) => {
				if (!aggregatedStats[col]) {
					aggregatedStats[col] = { ...stats };
				} else {
					// Merge statistics (for numeric: average, for categorical: combine top values)
					if (stats.type === "numeric" && aggregatedStats[col].type === "numeric") {
						aggregatedStats[col] = {
							...aggregatedStats[col],
							count: (aggregatedStats[col].count || 0) + (stats.count || 0),
							mean: ((aggregatedStats[col].mean || 0) + (stats.mean || 0)) / 2,
							min: Math.min(aggregatedStats[col].min || Infinity, stats.min || Infinity),
							max: Math.max(aggregatedStats[col].max || -Infinity, stats.max || -Infinity),
						};
					} else if (stats.type === "categorical" && aggregatedStats[col].type === "categorical") {
						// Combine top values
						const top1 = aggregatedStats[col].top_values || {};
						const top2 = stats.top_values || {};
						const combined = { ...top1 };
						Object.entries(top2).forEach(([val, count]) => {
							combined[val] = (combined[val] || 0) + (count as number);
						});
						aggregatedStats[col].top_values = combined;
						aggregatedStats[col].count = (aggregatedStats[col].count || 0) + (stats.count || 0);
					}
				}
			});
		}
	});

	// Combine correlations (deduplicate and average if duplicates)
	const correlationMap = new Map<string, number>();
	insights.forEach(insight => {
		(insight.correlations || []).forEach(corr => {
			const key = `${corr.x}-${corr.y}`;
			const reverseKey = `${corr.y}-${corr.x}`;
			
			if (correlationMap.has(key) || correlationMap.has(reverseKey)) {
				const existingKey = correlationMap.has(key) ? key : reverseKey;
				const existing = correlationMap.get(existingKey) || 0;
				correlationMap.set(existingKey, (existing + corr.value) / 2);
			} else {
				correlationMap.set(key, corr.value);
			}
		});
	});

	const correlations: Array<{ x: string; y: string; value: number }> = [];
	correlationMap.forEach((value, key) => {
		const [x, y] = key.split("-");
		correlations.push({ x, y, value });
	});

	// Combine clusters (from all workers)
	const allClusters: Array<{ x: number; y: number; cluster: string; label: string }> = [];
	insights.forEach(insight => {
		(insight.clusters || []).forEach(cluster => {
			allClusters.push(cluster);
		});
	});

	// Combine trends (merge time series if same metric)
	const trendMap = new Map<string, any>();
	insights.forEach(insight => {
		(insight.trends || []).forEach(trend => {
			const key = `${trend.metric}-${trend.over}`;
			if (!trendMap.has(key)) {
				trendMap.set(key, { ...trend, data_points: [] });
			}
			const existing = trendMap.get(key)!;
			existing.data_points.push(...(trend.data_points || []));
		});
	});
	const trends = Array.from(trendMap.values());

	// Combine outliers
	const allOutliers: Array<{ column: string; row: number; value: number; deviation: number }> = [];
	insights.forEach((insight, workerIdx) => {
		(insight.outliers || []).forEach(outlier => {
			allOutliers.push({ ...outlier, row: workerIdx * 1000 + outlier.row }); // Offset row numbers
		});
	});

	return {
		num_samples: total_samples,
		columns: Array.from(allColumns),
		numeric_columns: Array.from(allNumericColumns),
		categorical_columns: Array.from(allCategoricalColumns),
		statistics: aggregatedStats,
		correlations: correlations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)), // Sort by absolute correlation
		clusters: allClusters,
		trends,
		outliers: allOutliers.slice(0, 20), // Limit to top 20 outliers
	};
}

/**
 * Generate chart data from aggregated data insights
 */
export function generateChartsFromDataInsights(insights: AggregatedInsights): ChartData {
	// Correlation matrix
	const correlationMatrix = insights.correlations || [];

	// Trends (flatten time series)
	const trends: Array<{ date: string; value: number }> = [];
	insights.trends.forEach(trend => {
		(trend.data_points || []).forEach(point => {
			trends.push({
				date: point.date || "",
				value: point.value || 0,
			});
		});
	});

	// Clusters
	const clusters = insights.clusters || [];

	// Summary statistics
	const summary = {
		total_samples: insights.num_samples || 0,
		numeric_columns: insights.numeric_columns?.length || 0,
		categorical_columns: insights.categorical_columns?.length || 0,
		strong_correlations: correlationMatrix.filter(c => Math.abs(c.value) > 0.7).length,
		outliers_count: insights.outliers?.length || 0,
	};

	return {
		correlationMatrix,
		trends: trends.sort((a, b) => a.date.localeCompare(b.date)), // Sort by date
		clusters,
		summary,
	};
}

