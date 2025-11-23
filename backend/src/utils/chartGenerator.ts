/**
 * Chart Generator
 * Generates chart data from data insights for frontend visualization
 * Dynamically generates charts based on available data
 */

import { DataInsights } from "./csvAnalyzer.js";

export interface ChartsData {
	correlationMatrix: Array<{ x: string; y: string; value: number }>;
	trends: Array<{ date: string; value: number; label?: string }>;
	clusters: Array<{ x: number; y: number; cluster: string; label: string }>;
	outliers: Array<{ column: string; row: number; value: number; deviation: number }>;
	// Key-value bar chart
	keyValueBarChart?: {
		title: string;
		data: Array<{ name: string; value: number }>;
	};
	summary: {
		total_samples: number;
		numeric_columns: number;
		categorical_columns: number;
		strong_correlations: number;
		outliers_count: number;
	};
}

export function generateChartsFromDataInsights(insights: DataInsights): ChartsData {
	// ✅ INTELLIGENT CHART GENERATION: Only generate charts that are RELEVANT to the data
	
	// 1. Correlations: Only if we have 2+ numeric columns with actual correlations
	const correlationMatrix = (insights.correlations || []).filter(corr => Math.abs(corr.value) > 0.1); // Only meaningful correlations
	
	// 2. Trends: ONLY if we have time-based trends (NOT row index!)
	let trends: Array<{ date: string; value: number; label?: string }> = [];
	if (insights.trends && insights.trends.length > 0) {
		// Filter out "row index" trends - only keep real time-based trends
		for (const trendData of insights.trends) {
			// ❌ SKIP trends over "row index" - itu tidak bermakna!
			if (trendData.over && trendData.over.toLowerCase().includes("row index")) {
				console.log(`[CHARTS] Skipping irrelevant trend: ${trendData.metric} over ${trendData.over}`);
				continue;
			}
			
			// Only include trends with actual time-based data
			if (trendData.data_points && trendData.data_points.length > 0) {
				trends.push(...trendData.data_points.map(dp => ({
					date: dp.date,
					value: dp.value,
					label: `${trendData.metric} over ${trendData.over}`,
				})));
			}
		}
	}
	
	// 3. Clusters: Only if we have meaningful clusters (2+ numeric columns, sufficient data, and meaningful distribution)
	const clusters = (insights.clusters || []).filter((cluster, idx, arr) => {
		// Only keep clusters if we have meaningful spread (not all same cluster)
		const uniqueClusters = new Set(arr.map(c => c.cluster));
		// ✅ MUST have at least 2 different clusters AND at least 5 data points to be meaningful
		return uniqueClusters.size >= 2 && arr.length >= 5;
	});
	
	// Generate key-value bar chart if detected
	// ✅ ONLY generate if we have actual meaningful key-value pairs (not synthetic/derived labels)
	let keyValueBarChart: { title: string; data: Array<{ name: string; value: number }> } | undefined;
	if (insights.isKeyValueStructure && insights.keyColumn && insights.valueColumn && insights.keyValuePairs) {
		// Filter out synthetic/derived labels (like "outlier_row_9", "cluster_A", etc.)
		const validPairs = insights.keyValuePairs.filter(kv => {
			const key = kv.key.toLowerCase();
			// Skip synthetic labels
			if (key.includes('outlier') || key.includes('row_') || key.includes('cluster') || 
			    key.includes('sample_') || key.includes('index_') || key.includes('point_')) {
				return false;
			}
			return true;
		});
		
		if (validPairs.length > 0) {
			keyValueBarChart = {
				title: `${insights.keyColumn} Distribution`,
				data: validPairs.map(kv => ({
					name: kv.key.length > 30 ? kv.key.substring(0, 30) + '...' : kv.key, // Truncate long names
					value: kv.value,
				})),
			};
			console.log(`[CHARTS] Generated key-value bar chart: ${keyValueBarChart.data.length} entries (filtered ${insights.keyValuePairs.length - validPairs.length} synthetic entries)`);
		}
	}
	
	// Use outliers from insights (already detected from actual CSV rows)
	const outliers = insights.outliers || [];

	// Count strong correlations (|value| > 0.5)
	const strong_correlations = correlationMatrix.filter(
		(c) => Math.abs(c.value) > 0.5
	).length;

	console.log(`[CHARTS] Generated charts from ACTUAL CSV data (NO FALLBACK):`, {
		correlations: correlationMatrix.length,
		trends: trends.length,
		clusters: clusters.length,
		outliers: outliers.length,
		keyValueBarChart: keyValueBarChart ? keyValueBarChart.data.length : 0,
		isKeyValueStructure: insights.isKeyValueStructure,
		hasTrendData: trends.length > 0,
		hasClusterData: clusters.length > 0,
		summary: {
			total_samples: insights.num_samples,
			numeric_columns: insights.numeric_columns?.length || 0,
			categorical_columns: insights.categorical_columns?.length || 0,
			strong_correlations,
			outliers_count: outliers.length,
		},
	});

	return {
		correlationMatrix,
		trends,
		clusters,
		outliers,
		keyValueBarChart,
		summary: {
			total_samples: insights.num_samples,
			numeric_columns: insights.numeric_columns?.length || 0,
			categorical_columns: insights.categorical_columns?.length || 0,
			strong_correlations,
			outliers_count: outliers.length,
		},
	};
}

/**
 * ✅ LLM-GENERATED CHARTS CONVERTER
 * Converts LLM-generated chart specifications to ChartsData format
 * No more hardcoded logic - LLM decides what charts are relevant!
 */
export function convertLLMChartsToChartsData(
	llmCharts: {
		trends?: Array<{ date: string; value: number; label?: string }>;
		barCharts?: Array<{ title: string; data: Array<{ name: string; value: number }> }>;
		scatterPlots?: Array<{ title: string; data: Array<{ x: number; y: number; label?: string }> }>;
		pieCharts?: Array<{ title: string; data: Array<{ name: string; value: number }> }>;
		lineCharts?: Array<{ title: string; data: Array<{ x: string | number; y: number; label?: string }> }>;
		correlations?: Array<{ x: string; y: string; value: number }>;
	},
	insights: DataInsights
): ChartsData {
	// ✅ Use LLM-generated trends (intelligent, not hardcoded!)
	const trends = llmCharts.trends || llmCharts.lineCharts?.map(lc => 
		lc.data.map(d => ({ date: String(d.x), value: d.y, label: lc.title }))
	).flat() || [];
	
	// ✅ Use LLM-generated bar charts (convert first one to keyValueBarChart if needed)
	// ✅ Filter out synthetic/fake labels from LLM-generated charts
	let keyValueBarChart: { title: string; data: Array<{ name: string; value: number }> } | undefined;
	if (llmCharts.barCharts && llmCharts.barCharts.length > 0) {
		const chart = llmCharts.barCharts[0];
		// Filter out synthetic labels (outlier_row_X, cluster_A, sample_N, etc.)
		const validData = chart.data.filter(d => {
			const name = String(d.name || '').toLowerCase();
			return !name.includes('outlier') && !name.includes('row_') && 
			       !name.includes('cluster') && !name.includes('sample_') &&
			       !name.includes('index_') && !name.includes('point_') &&
			       !name.includes('data point');
		});
		if (validData.length > 0) {
			keyValueBarChart = { ...chart, data: validData };
		}
	} else if (llmCharts.pieCharts && llmCharts.pieCharts.length > 0) {
		const chart = llmCharts.pieCharts[0];
		const validData = chart.data.filter(d => {
			const name = String(d.name || '').toLowerCase();
			return !name.includes('outlier') && !name.includes('row_') && 
			       !name.includes('cluster') && !name.includes('sample_');
		});
		if (validData.length > 0) {
			keyValueBarChart = { ...chart, data: validData };
		}
	}
	
	// ✅ Use LLM-generated scatter plots as clusters
	// ✅ Only if we have meaningful data (5+ points, not synthetic labels)
	const clusters = llmCharts.scatterPlots?.flatMap(sp => 
		sp.data
			.filter(d => {
				// Filter out synthetic labels
				const label = String(d.label || '').toLowerCase();
				return !label.includes('outlier') && !label.includes('row_') &&
				       !label.includes('sample_') && !label.includes('point_');
			})
			.map((d, idx) => ({
				x: d.x,
				y: d.y,
				cluster: String(idx % 3), // Simple cluster assignment
				label: d.label || sp.title,
			}))
	).filter((c, idx, arr) => {
		// Only keep if we have at least 5 points and 2+ unique clusters
		const uniqueClusters = new Set(arr.map(a => a.cluster));
		return arr.length >= 5 && uniqueClusters.size >= 2;
	}) || [];
	
	// ✅ Use LLM-generated correlations
	const correlationMatrix = llmCharts.correlations || [];
	
	// Outliers - keep from insights (harder for LLM to generate accurately)
	const outliers = insights.outliers || [];
	
	const strong_correlations = correlationMatrix.filter(
		(c) => Math.abs(c.value) > 0.5
	).length;
	
	console.log(`[CHARTS] ✅ Converted LLM-generated charts:`, {
		trends: trends.length,
		barCharts: llmCharts.barCharts?.length || 0,
		scatterPlots: llmCharts.scatterPlots?.length || 0,
		pieCharts: llmCharts.pieCharts?.length || 0,
		lineCharts: llmCharts.lineCharts?.length || 0,
		correlations: correlationMatrix.length,
		keyValueBarChart: keyValueBarChart ? keyValueBarChart.data.length : 0,
	});
	
	return {
		correlationMatrix,
		trends,
		clusters,
		outliers,
		keyValueBarChart,
		summary: {
			total_samples: insights.num_samples,
			numeric_columns: insights.numeric_columns?.length || 0,
			categorical_columns: insights.categorical_columns?.length || 0,
			strong_correlations,
			outliers_count: outliers.length,
		},
	};
}
