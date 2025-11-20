/**
 * OpenRouter LLM Service for AI-Generated Insights
 * Generates data analysis stories, insights, and visualizations descriptions
 * Uses OpenRouter API for LLM inference
 */

import axios from "axios";

interface OpenRouterConfig {
	apiKey?: string;
	model: string;
	baseUrl: string;
	timeout: number;
}

// OpenRouter configuration
// Support multiple models as fallback (comma-separated)
const getModels = (): string[] => {
	const modelEnv = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
	// Strip comments (everything after #)
	const modelsWithoutComment = modelEnv.split("#")[0].trim();
	return modelsWithoutComment.split(",").map(m => m.trim()).filter(Boolean);
};

const DEFAULT_CONFIG: OpenRouterConfig = {
	apiKey: process.env.OPENROUTER_API_KEY,
	model: getModels()[0] || "openai/gpt-4o-mini", // Primary model (first in list)
	baseUrl: "https://openrouter.ai/api/v1",
	timeout: 60000, // 60 seconds
};

// Get all available models (primary + fallbacks)
const getAvailableModels = (): string[] => {
	return getModels();
};

interface TrainingMetrics {
	numWorkers: number;
	avgFinalLoss: number;
	numSamples: number[];
	lossHistories: number[][];
	workerInfo: Array<{
		nodeId: string;
		suiAddress?: string;
		numSamples: number;
		finalLoss: number;
	}>;
	// Data insights from CSV analysis
	dataInsights?: {
		num_samples: number;
		columns: string[];
		numeric_columns?: string[];
		categorical_columns?: string[];
		statistics?: Record<string, any>;
		correlations?: Array<{ x: string; y: string; value: number }>;
		clusters?: Array<{ x: number; y: number; cluster: string; label: string }>;
		trends?: Array<{ metric: string; over: string; direction: string; change: number }>;
		outliers?: Array<{ column: string; row: number; value: number; deviation: number }>;
	};
	// Charts generated from actual data
	chartsData?: {
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
	};
}

interface InsightRequest {
	metrics: TrainingMetrics;
	userPrompt?: string;
	aggregatedHash: string;
	hasEncryption: boolean;
}

interface InsightResponse {
	title: string;
	summary: string;
	keyFindings: string[];
	recommendations?: string[];
	visualizationHints?: {
		correlation?: string[];
		trends?: string[];
		clusters?: string[];
	};
}

/**
 * Generate AI insight using OpenRouter API with fallback models
 * Tries models in order: primary -> fallback1 -> fallback2
 */
export async function generateInsight(request: InsightRequest): Promise<InsightResponse> {
	const { apiKey, baseUrl, timeout } = DEFAULT_CONFIG;

	if (!apiKey) {
		console.warn("[LLM] OpenRouter API key not set, using fallback insight");
		return generateFallbackInsight(request);
	}

	const models = getAvailableModels();
	if (models.length === 0) {
		console.warn("[LLM] No models configured, using fallback insight");
		return generateFallbackInsight(request);
	}

	// Prepare prompt for LLM
	const prompt = buildInsightPrompt(request);

	// Try each model in order until one succeeds
	for (let i = 0; i < models.length; i++) {
		const model = models[i];
		const isLast = i === models.length - 1;

		try {
			console.log(`[LLM] Trying model ${i + 1}/${models.length}: ${model}`);

			// Call OpenRouter API
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

			// Parse OpenRouter response
			const content = response.data.choices?.[0]?.message?.content || "";
			
			if (!content) {
				console.warn(`[LLM] Empty response from model ${model}, trying next...`);
				if (isLast) {
					return generateFallbackInsight(request);
				}
				continue; // Try next model
			}

			// Parse structured output from LLM
			const parsed = parseInsightResponse(content, request);

			console.log(`[LLM] ✅ AI insight generated with model ${i + 1}/${models.length} (${model}):`, {
				title: parsed.title,
				summaryLength: parsed.summary.length,
				findingsCount: parsed.keyFindings.length,
			});

			return parsed;
		} catch (error: any) {
			console.error(`[LLM] Error with model ${model}:`, error?.message || error);
			
			// If this is the last model, use fallback
			if (isLast) {
				console.error("[LLM] All models failed, using fallback insight");
				return generateFallbackInsight(request);
			}
			
			// Otherwise, try next model
			console.log(`[LLM] Trying next model...`);
			continue;
		}
	}

	// Should never reach here, but just in case
	return generateFallbackInsight(request);
}

/**
 * Build prompt for LLM based on training metrics
 */
function buildInsightPrompt(request: InsightRequest): string {
	const { metrics, userPrompt, hasEncryption } = request;

	// Build prompt with actual data insights (not just training metrics)
	let prompt = `You are a data analysis expert. Analyze the following federated learning results and generate insights from the ACTUAL DATA that was analyzed.

TRAINING METRICS:
- Number of workers: ${metrics.numWorkers}
- Average final loss: ${metrics.avgFinalLoss.toFixed(4)}
- Total samples processed: ${metrics.numSamples.reduce((a, b) => a + b, 0)}
- Workers:
${metrics.workerInfo.map((w, i) => `  ${i + 1}. ${w.nodeId} (${w.numSamples} samples, final loss: ${w.finalLoss.toFixed(4)})`).join("\n")}

LOSS HISTORY:
${metrics.lossHistories.map((history, i) => `  Worker ${i + 1}: ${history.map(l => l.toFixed(3)).join(" → ")}`).join("\n")}
`;

	// Add actual data insights (from CSV analysis)
	if (metrics.dataInsights) {
		const insights = metrics.dataInsights;
		prompt += `\nACTUAL DATA ANALYSIS (from CSV):\n`;
		prompt += `- Total samples analyzed: ${insights.num_samples}\n`;
		prompt += `- Columns: ${(insights.columns || []).join(", ")}\n`;
		
		if (insights.numeric_columns && insights.numeric_columns.length > 0) {
			prompt += `- Numeric columns: ${insights.numeric_columns.join(", ")}\n`;
		}
		if (insights.categorical_columns && insights.categorical_columns.length > 0) {
			prompt += `- Categorical columns: ${insights.categorical_columns.join(", ")}\n`;
		}
		
		// Add statistics
		if (insights.statistics && Object.keys(insights.statistics).length > 0) {
			prompt += `\nSTATISTICS:\n`;
			Object.entries(insights.statistics).slice(0, 5).forEach(([col, stats]) => {
				if (stats.type === "numeric") {
					prompt += `  ${col}: mean=${stats.mean?.toFixed(2)}, min=${stats.min?.toFixed(2)}, max=${stats.max?.toFixed(2)}, std=${stats.std?.toFixed(2)}\n`;
				} else if (stats.type === "categorical") {
					const topValues = Object.entries(stats.top_values || {}).slice(0, 3).map(([val, count]) => `${val}(${count})`).join(", ");
					prompt += `  ${col}: ${stats.unique} unique values, top: ${topValues}\n`;
				}
			});
		}
		
		// Add correlations
		if (insights.correlations && insights.correlations.length > 0) {
			prompt += `\nSTRONG CORRELATIONS:\n`;
			insights.correlations.slice(0, 5).forEach(corr => {
				prompt += `  ${corr.x} ↔ ${corr.y}: ${corr.value.toFixed(3)}\n`;
			});
		}
		
		// Add trends
		if (insights.trends && insights.trends.length > 0) {
			prompt += `\nTRENDS:\n`;
			insights.trends.forEach(trend => {
				prompt += `  ${trend.metric} over ${trend.over}: ${trend.direction} (${trend.change > 0 ? "+" : ""}${trend.change.toFixed(2)}%)\n`;
			});
		}
		
		// Add outliers
		if (insights.outliers && insights.outliers.length > 0) {
			prompt += `\nOUTLIERS DETECTED:\n`;
			insights.outliers.slice(0, 5).forEach(outlier => {
				prompt += `  ${outlier.column} at row ${outlier.row}: value=${outlier.value.toFixed(2)} (${outlier.deviation.toFixed(1)} std dev)\n`;
			});
		}
		
		// Add clusters
		if (insights.clusters && insights.clusters.length > 0) {
			const clusterCounts: Record<string, number> = {};
			insights.clusters.forEach(cluster => {
				clusterCounts[cluster.cluster] = (clusterCounts[cluster.cluster] || 0) + 1;
			});
			prompt += `\nCLUSTERS:\n`;
			Object.entries(clusterCounts).forEach(([cluster, count]) => {
				prompt += `  Cluster ${cluster}: ${count} data points\n`;
			});
		}
	}
	
	// Add charts data summary
	if (metrics.chartsData) {
		prompt += `\nCHARTS GENERATED:\n`;
		prompt += `- Correlation matrix: ${metrics.chartsData.correlationMatrix.length} correlations\n`;
		prompt += `- Trends: ${metrics.chartsData.trends.length} data points\n`;
		prompt += `- Clusters: ${metrics.chartsData.clusters.length} points\n`;
		prompt += `- Summary: ${metrics.chartsData.summary.total_samples} samples, ${metrics.chartsData.summary.numeric_columns} numeric cols, ${metrics.chartsData.summary.strong_correlations} strong correlations, ${metrics.chartsData.summary.outliers_count} outliers\n`;
	}
	
	prompt += `\n${hasEncryption ? "- Data was encrypted and verified on-chain\n" : ""}`;
	prompt += `${userPrompt ? `USER QUESTION: "${userPrompt}"\n` : ""}`;

	prompt += `\nPlease provide:
1. A concise title (max 10 words) based on the ACTUAL DATA analyzed (not just training metrics)
2. A detailed summary (2-3 paragraphs) explaining:
   - What the ACTUAL DATA shows (columns, statistics, patterns)
   - Key trends and patterns from the data
   - Strong correlations found
   - Clusters identified
   - Outliers detected
   - Any anomalies or interesting findings from the CSV data
3. Key findings (3-5 bullet points) from the actual data analysis
4. Optional recommendations (if applicable) based on data insights
5. Explanation of the charts generated:
   - What correlations mean
   - What trends show
   - What clusters represent

IMPORTANT: Focus on insights from the ACTUAL CSV DATA, not just training metrics. Explain what the data tells us.

Format your response as JSON:
{
  "title": "Title here",
  "summary": "Detailed summary here...",
  "keyFindings": ["Finding 1", "Finding 2", ...],
  "recommendations": ["Recommendation 1", ...],
  "visualizationHints": {
    "correlation": ["Metric A vs Metric B", ...],
    "trends": ["Trend description", ...],
    "clusters": ["Cluster description", ...]
  }
}`;

	return prompt;
}

/**
 * Parse LLM response into structured format
 */
function parseInsightResponse(llmResponse: string, request: InsightRequest): InsightResponse {
	try {
		// Try to extract JSON from response (may have extra text)
		const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			return {
				title: parsed.title || "Federated Learning Analysis",
				summary: parsed.summary || llmResponse,
				keyFindings: parsed.keyFindings || [],
				recommendations: parsed.recommendations || [],
				visualizationHints: parsed.visualizationHints || {},
			};
		}
	} catch (error) {
		console.warn("[LLM] Failed to parse JSON from response, using raw text");
	}

	// Fallback: Use raw response as summary
	return {
		title: "Federated Learning Analysis",
		summary: llmResponse.trim(),
		keyFindings: [],
		recommendations: [],
		visualizationHints: {},
	};
}

/**
 * Generate fallback insight if LLM fails
 */
function generateFallbackInsight(request: InsightRequest): InsightResponse {
	const { metrics, userPrompt } = request;

	return {
		title: "Federated Learning Analysis",
		summary: `Data analyzed across ${metrics.numWorkers} federated learning workers. ` +
			`Average final loss: ${metrics.avgFinalLoss.toFixed(4)}. ` +
			`Total samples: ${metrics.numSamples.reduce((a, b) => a + b, 0)}. ` +
			`${userPrompt ? `User question: ${userPrompt}. ` : ""}` +
			`Training completed successfully with all workers contributing to the model.`,
		keyFindings: [
			`${metrics.numWorkers} workers participated in federated learning`,
			`Average final loss of ${metrics.avgFinalLoss.toFixed(4)} achieved`,
			`Model aggregated successfully with cryptographic verification`,
		],
		recommendations: [],
		visualizationHints: {
			correlation: ["Loss vs Epoch", "Worker Performance"],
			trends: ["Loss convergence over epochs"],
			clusters: ["Worker performance clusters"],
		},
	};
}

/**
 * Check if OpenRouter is available (has API key)
 * Keep function name for compatibility with coordinator
 */
export async function checkOllamaHealth(): Promise<boolean> {
	const { apiKey } = DEFAULT_CONFIG;
	const models = getAvailableModels();
	
	if (!apiKey) {
		console.warn("[LLM] ⚠️  OpenRouter API key not set. Set OPENROUTER_API_KEY environment variable.");
		return false;
	}

	if (models.length === 0) {
		console.warn("[LLM] ⚠️  No models configured. Set OPENROUTER_MODEL environment variable.");
		return false;
	}

	console.log(`[LLM] ✅ OpenRouter configured with ${models.length} model(s): ${models.join(", ")}`);
	return true;
}

