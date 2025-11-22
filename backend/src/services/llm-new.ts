/**
 * NEW LLM Service - Simplified for Direct Analysis
 * Generates insights from analysisSummary (no training metrics)
 */

import axios from "axios";
import { AnalysisSummary } from "../types.js";

interface OpenRouterConfig {
	apiKey?: string;
	model: string;
	baseUrl: string;
	timeout: number;
}

const getModels = (): string[] => {
	const modelEnv = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
	const modelsWithoutComment = modelEnv.split("#")[0].trim();
	return modelsWithoutComment.split(",").map((m) => m.trim()).filter(Boolean);
};

const DEFAULT_CONFIG: OpenRouterConfig = {
	apiKey: process.env.OPENROUTER_API_KEY,
	model: getModels()[0] || "openai/gpt-4o-mini",
	baseUrl: "https://openrouter.ai/api/v1",
	timeout: 60000,
};

interface LLMInsights {
	title: string;
	summary: string;
	keyFindings?: string[];
	recommendations?: string[];
	chartRecommendations?: string[]; // e.g., "loss vs epoch", "scatter income vs score"
	// ✅ LLM-GENERATED CHARTS: No more hardcoded logic!
	charts?: {
		trends?: Array<{ date: string; value: number; label?: string }>;
		barCharts?: Array<{ title: string; data: Array<{ name: string; value: number }> }>;
		scatterPlots?: Array<{ title: string; data: Array<{ x: number; y: number; label?: string }> }>;
		pieCharts?: Array<{ title: string; data: Array<{ name: string; value: number }> }>;
		lineCharts?: Array<{ title: string; data: Array<{ x: string | number; y: number; label?: string }> }>;
		correlations?: Array<{ x: string; y: string; value: number }>;
	};
}

export async function generateInsightFromAnalysis(request: {
	analysisSummary: AnalysisSummary;
	userPrompt?: string;
}): Promise<LLMInsights> {
	const { apiKey, baseUrl, timeout } = DEFAULT_CONFIG;

	if (!apiKey) {
		console.warn("[LLM] OpenRouter API key not set, using fallback insight");
		return generateFallbackInsight(request);
	}

	const models = getModels();
	if (models.length === 0) {
		console.warn("[LLM] No models configured, using fallback insight");
		return generateFallbackInsight(request);
	}

	const prompt = buildAnalysisPrompt(request);

	// Try each model in order
	for (let i = 0; i < models.length; i++) {
		const model = models[i];
		const isLast = i === models.length - 1;

		try {
			console.log(`[LLM] Trying model ${i + 1}/${models.length}: ${model}`);

			const response = await axios.post(
				`${baseUrl}/chat/completions`,
				{
					model: model,
					messages: [
						{
							role: "user",
							content: prompt,
						},
					],
					temperature: 0.7,
					max_tokens: 2000,
				},
				{
					timeout: timeout,
					headers: {
						"Authorization": `Bearer ${apiKey}`,
						"Content-Type": "application/json",
						"HTTP-Referer": process.env.OPENROUTER_REFERER || "https://github.com/flowdata-studio",
						"X-Title": "FlowData Studio",
					},
				}
			);

			const content = response.data.choices?.[0]?.message?.content || "";
			if (content) {
				console.log(`[LLM] ✅ Success with model: ${model}`);
				return parseInsightResponse(content, request);
			}
		} catch (error: any) {
			console.warn(`[LLM] ❌ Model ${model} failed:`, error?.message || error);
			if (isLast) {
				console.warn("[LLM] All models failed, using fallback insight");
				return generateFallbackInsight(request);
			}
		}
	}

	return generateFallbackInsight(request);
}

function buildAnalysisPrompt(request: { analysisSummary: AnalysisSummary; userPrompt?: string }): string {
	const { analysisSummary, userPrompt } = request;
	const { dataInsights, chartsData } = analysisSummary;

	let prompt = `You are a FLEXIBLE data analysis expert. Your job is to INTELLIGENTLY understand and analyze ANY data structure the user uploads.

CRITICAL: The user can upload ANY format - your job is to ADAPT and UNDERSTAND it, not require specific formats.

DATA ANALYSIS SUMMARY:
- Total samples: ${dataInsights.num_samples}
- Columns: ${dataInsights.columns.join(", ")}
- Raw data structure: ${dataInsights.num_samples > 0 ? "Detected" : "Empty"}
`;

	// CRITICAL: If key-value structure, explain it clearly
	if ((dataInsights as any).isKeyValueStructure && (dataInsights as any).keyColumn && (dataInsights as any).valueColumn) {
		prompt += `\n⚠️ KEY-VALUE STRUCTURE DETECTED:\n`;
		prompt += `This is NOT a time series or multi-column dataset.\n`;
		prompt += `It's a key-value pair structure where:\n`;
		prompt += `- Key column: "${(dataInsights as any).keyColumn}" (contains metric/field names)\n`;
		prompt += `- Value column: "${(dataInsights as any).valueColumn}" (contains corresponding values)\n`;
		prompt += `- Each row represents ONE metric/field with its value\n`;
		prompt += `- This is like a configuration file or benchmark report, NOT a data table\n`;
		if ((dataInsights as any).keyValuePairs && (dataInsights as any).keyValuePairs.length > 0) {
			prompt += `\nKEY-VALUE PAIRS (first 10):\n`;
			((dataInsights as any).keyValuePairs as Array<{ key: string; value: number }>).slice(0, 10).forEach((kv: { key: string; value: number }) => {
				prompt += `  "${kv.key}": ${kv.value}\n`;
			});
		}
		prompt += `\n⚠️ DO NOT analyze this as time series, trends, or correlations!\n`;
		prompt += `⚠️ Focus on individual metrics and their values!\n`;
		prompt += `⚠️ This is a single record/snapshot, not a dataset with multiple samples!\n\n`;
	}

	if (dataInsights.numeric_columns && dataInsights.numeric_columns.length > 0) {
		prompt += `- Numeric columns: ${dataInsights.numeric_columns.join(", ")}\n`;
	}
	if (dataInsights.categorical_columns && dataInsights.categorical_columns.length > 0) {
		prompt += `- Categorical columns: ${dataInsights.categorical_columns.join(", ")}\n`;
	}

	// Add statistics
	if (dataInsights.statistics && Object.keys(dataInsights.statistics).length > 0) {
		prompt += `\nSTATISTICS:\n`;
		Object.entries(dataInsights.statistics).slice(0, 5).forEach(([col, stats]: [string, any]) => {
			if (stats.type === "numeric") {
				prompt += `  ${col}: mean=${stats.mean?.toFixed(2)}, min=${stats.min?.toFixed(2)}, max=${stats.max?.toFixed(2)}, std=${stats.std?.toFixed(2)}\n`;
			} else if (stats.type === "categorical") {
				const topValues = Object.entries(stats.top_values || {}).slice(0, 3).map(([val, count]) => `${val}(${count})`).join(", ");
				prompt += `  ${col}: ${stats.unique} unique values, top: ${topValues}\n`;
			}
		});
	}

	// Add correlations
	if (dataInsights.correlations && dataInsights.correlations.length > 0) {
		prompt += `\nSTRONG CORRELATIONS:\n`;
		dataInsights.correlations.slice(0, 5).forEach((corr) => {
			prompt += `  ${corr.x} ↔ ${corr.y}: ${corr.value.toFixed(3)}\n`;
		});
	}

	// Add trends
	if (dataInsights.trends && dataInsights.trends.length > 0) {
		prompt += `\nTRENDS:\n`;
		dataInsights.trends.forEach((trend) => {
			prompt += `  ${trend.metric} over ${trend.over}: ${trend.direction} (${trend.change > 0 ? "+" : ""}${trend.change.toFixed(2)}%)\n`;
		});
	}

	// Add outliers
	if (dataInsights.outliers && dataInsights.outliers.length > 0) {
		prompt += `\nOUTLIERS DETECTED:\n`;
		dataInsights.outliers.slice(0, 5).forEach((outlier) => {
			prompt += `  ${outlier.column} at row ${outlier.row}: value=${outlier.value.toFixed(2)} (${outlier.deviation.toFixed(1)} std dev)\n`;
		});
	}

	// Add clusters
	if (dataInsights.clusters && dataInsights.clusters.length > 0) {
		const clusterCounts: Record<string, number> = {};
		dataInsights.clusters.forEach((cluster) => {
			clusterCounts[cluster.cluster] = (clusterCounts[cluster.cluster] || 0) + 1;
		});
		prompt += `\nCLUSTERS:\n`;
		Object.entries(clusterCounts).forEach(([cluster, count]) => {
			prompt += `  Cluster ${cluster}: ${count} data points\n`;
		});
	}

	// Add chart summary
	prompt += `\nCHARTS GENERATED:\n`;
	prompt += `- Correlation matrix: ${chartsData.correlationMatrix.length} correlations\n`;
	prompt += `- Trends: ${chartsData.trends.length} data points\n`;
	prompt += `- Clusters: ${chartsData.clusters.length} points\n`;
	prompt += `- Summary: ${chartsData.summary.total_samples} samples, ${chartsData.summary.numeric_columns} numeric cols, ${chartsData.summary.strong_correlations} strong correlations, ${chartsData.summary.outliers_count} outliers\n`;

	if (userPrompt) {
		prompt += `\nUSER QUESTION: "${userPrompt}"\n`;
	}

	prompt += `\nPlease provide:
1. A concise title (max 10 words) based on the ACTUAL data structure
2. A detailed summary (2-3 paragraphs) explaining:
   - What the data ACTUALLY shows (be specific, don't make assumptions)
   - If key-value: focus on individual metrics and their values
   - If time series: focus on trends over time
   - If numeric pairs: focus on correlations and relationships
   - Only mention patterns that ACTUALLY exist in the data
   - Don't force trends/correlations if they don't exist
3. Key findings (3-5 bullet points) from ACTUAL data analysis (not assumptions)
4. Optional recommendations (if applicable) based on REAL insights
5. Chart recommendations (suggest charts that make sense for THIS data structure)

CRITICAL INSTRUCTIONS:
1. INTELLIGENTLY DETECT the data structure yourself - don't assume anything
2. ADAPT your analysis to what the data ACTUALLY is:
   - If it's schema/metadata (column_name, data_type) → analyze as database schema
   - If it's key-value pairs (Metric,Value) → analyze as configuration/benchmark
   - If it's time series → analyze trends
   - If it's table data → analyze correlations and patterns
   - If it's nested JSON → explain the structure
   - If it's ANYTHING ELSE → intelligently interpret it
3. DON'T force patterns that don't exist
4. DON'T assume format - let the data tell you what it is
5. BE CREATIVE and ADAPTIVE - user can upload anything!

${(dataInsights as any).isKeyValueStructure ? 
	'⚠️ KEY-VALUE STRUCTURE DETECTED: Analyze each metric individually. Focus on what each metric means and its value.' : 
	'🔍 INTELLIGENT DETECTION: Look at the columns and data to determine what this data represents. Adapt your analysis accordingly.'}

⚠️ CRITICAL: You MUST generate actual chart data based on the data provided, not just recommendations!

Look at the actual data structure and generate RELEVANT charts with REAL data points.

Format your response as JSON:
{
  "title": "Title here",
  "summary": "Detailed summary here...",
  "keyFindings": ["Finding 1", "Finding 2", ...],
  "recommendations": ["Recommendation 1", ...],
  "chartRecommendations": ["bar chart for key-value", "line chart for time series", ...],
  "charts": {
    "trends": [
      {"date": "2024-01-01", "value": 100, "label": "Sales over time"},
      {"date": "2024-01-02", "value": 150, "label": "Sales over time"}
    ],
    "barCharts": [
      {
        "title": "Category Distribution",
        "data": [
          {"name": "Category A", "value": 50},
          {"name": "Category B", "value": 30}
        ]
      }
    ],
    "scatterPlots": [
      {
        "title": "X vs Y Analysis",
        "data": [
          {"x": 10, "y": 20, "label": "Point 1"},
          {"x": 15, "y": 25, "label": "Point 2"}
        ]
      }
    ],
    "pieCharts": [
      {
        "title": "Distribution",
        "data": [
          {"name": "A", "value": 40},
          {"name": "B", "value": 60}
        ]
      }
    ],
    "lineCharts": [
      {
        "title": "Trend Analysis",
        "data": [
          {"x": "Jan", "y": 100},
          {"x": "Feb", "y": 150}
        ]
      }
    ],
    "correlations": [
      {"x": "Column A", "y": "Column B", "value": 0.75}
    ]
  }
}

IMPORTANT:
- Only generate charts that make sense for THIS data structure
- Use ACTUAL data values from the analysis (not fake data)
- If no time column → NO trends
- If key-value structure → generate bar chart
- If 2+ numeric columns → generate scatter/correlation
- If categorical → generate pie/bar chart
- Don't generate charts with empty/fake data!

Return ONLY the JSON, no other text.`;

	return prompt;
}

function parseInsightResponse(llmResponse: string, request: { analysisSummary: AnalysisSummary; userPrompt?: string }): LLMInsights {
	try {
		// Try to extract JSON from response
		const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			console.log("[LLM] ✅ Parsed charts from LLM:", {
				hasTrends: parsed.charts?.trends?.length > 0,
				hasBarCharts: parsed.charts?.barCharts?.length > 0,
				hasScatterPlots: parsed.charts?.scatterPlots?.length > 0,
				hasPieCharts: parsed.charts?.pieCharts?.length > 0,
				hasLineCharts: parsed.charts?.lineCharts?.length > 0,
				hasCorrelations: parsed.charts?.correlations?.length > 0,
			});
			
			return {
				title: parsed.title || "Data Analysis",
				summary: parsed.summary || llmResponse,
				keyFindings: parsed.keyFindings || [],
				recommendations: parsed.recommendations || [],
				chartRecommendations: parsed.chartRecommendations || [],
				// ✅ LLM-GENERATED CHARTS
				charts: parsed.charts || {},
			};
		}
	} catch (error) {
		console.warn("[LLM] Failed to parse JSON from response:", error);
	}

	return {
		title: "Data Analysis",
		summary: llmResponse.trim(),
		keyFindings: [],
		recommendations: [],
		chartRecommendations: [],
		charts: {},
	};
}

function generateFallbackInsight(request: { analysisSummary: AnalysisSummary; userPrompt?: string }): LLMInsights {
	const { dataInsights } = request.analysisSummary;
	return {
		title: "Data Analysis Results",
		summary: `Analyzed ${dataInsights.num_samples} samples with ${dataInsights.columns.length} columns. Found ${dataInsights.numeric_columns?.length || 0} numeric columns and ${dataInsights.categorical_columns?.length || 0} categorical columns.`,
		keyFindings: [
			`Total samples: ${dataInsights.num_samples}`,
			`Columns analyzed: ${dataInsights.columns.length}`,
			`Strong correlations: ${dataInsights.correlations?.filter((c) => Math.abs(c.value) > 0.5).length || 0}`,
		],
		recommendations: [],
		chartRecommendations: ["correlation matrix", "trend analysis", "cluster visualization"],
		charts: {}, // No charts in fallback - LLM must generate them
	};
}

