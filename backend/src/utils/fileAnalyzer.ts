/**
 * Universal File Analyzer
 * Routes to appropriate analyzer based on file type
 */

import { detectFileType, FileType } from "./fileTypeDetector.js";
import { analyzeCSV, DataInsights } from "./csvAnalyzer.js";
import { analyzeJSON } from "./jsonAnalyzer.js";
import { analyzeImage } from "./imageAnalyzer.js";
import { analyzePDF } from "./pdfAnalyzer.js";
import { analyzeWord } from "./wordAnalyzer.js";

export interface FileAnalysisResult {
	fileType: FileType;
	dataInsights: DataInsights;
	extractedText?: string;
	metadata?: any;
}

export function analyzeFile(
	buffer: Buffer,
	filename: string,
	broadcast?: BroadcastFunction
): FileAnalysisResult {
	const fileInfo = detectFileType(buffer, filename);
	let dataInsights: DataInsights;
	let extractedText: string | undefined;
	let metadata: any;

	if (broadcast) {
		broadcast("status", {
			stage: "analyzing",
			message: `Analyzing ${fileInfo.type.toUpperCase()} file...`,
			progress: 20,
		});
	}

	switch (fileInfo.type) {
		case "csv":
			try {
				const csvContent = buffer.toString("utf-8");
				if (!csvContent || csvContent.trim().length === 0) {
					console.warn("[ANALYZER] CSV file is empty");
					dataInsights = {
						num_samples: 0,
						columns: [],
						statistics: {},
						correlations: [],
						clusters: [],
						trends: [],
						outliers: [],
					};
				} else {
					dataInsights = analyzeCSV(csvContent);
					extractedText = csvContent;
					
					// Log for debugging
					console.log(`[ANALYZER] CSV analyzed: ${dataInsights.num_samples} samples, ${dataInsights.columns.length} columns`);
					if (dataInsights.num_samples === 0) {
						console.warn("[ANALYZER] CSV parsing resulted in 0 samples. Content preview:", csvContent.substring(0, 200));
					}
				}
			} catch (error) {
				console.error("[ANALYZER] Failed to analyze CSV:", error);
				dataInsights = {
					num_samples: 0,
					columns: [],
					statistics: {},
					correlations: [],
					clusters: [],
					trends: [],
					outliers: [],
				};
			}
			break;

		case "json":
			try {
				const jsonText = buffer.toString("utf-8").trim();
				console.log(`[ANALYZER] Parsing JSON file, size: ${jsonText.length} bytes`);
				const jsonContent = JSON.parse(jsonText);
				console.log(`[ANALYZER] JSON parsed successfully. Type: ${Array.isArray(jsonContent) ? "array" : typeof jsonContent}`);
				dataInsights = analyzeJSON(jsonContent);
				console.log(`[ANALYZER] JSON analyzed: ${dataInsights.num_samples} samples, ${dataInsights.columns.length} columns`);
				extractedText = JSON.stringify(jsonContent, null, 2);
			} catch (error: any) {
				console.error("[ANALYZER] Failed to parse JSON:", error?.message || error);
				console.error("[ANALYZER] JSON content preview:", buffer.toString("utf-8").substring(0, 200));
				dataInsights = {
					num_samples: 0,
					columns: [],
					statistics: {},
					correlations: [],
					clusters: [],
					trends: [],
					outliers: [],
				};
			}
			break;

		case "image":
			try {
				const imageResult = analyzeImage(buffer, filename);
				dataInsights = imageResult.insights;
				metadata = imageResult.metadata;
			} catch (error) {
				console.error("[ANALYZER] Failed to analyze image:", error);
				dataInsights = {
					num_samples: 0,
					columns: [],
					statistics: {},
					correlations: [],
					clusters: [],
					trends: [],
					outliers: [],
				};
			}
			break;

		case "pdf":
			try {
				const pdfResult = analyzePDF(buffer);
				dataInsights = pdfResult.insights;
				extractedText = pdfResult.text;
			} catch (error) {
				console.error("[ANALYZER] Failed to analyze PDF:", error);
				dataInsights = {
					num_samples: 0,
					columns: [],
					statistics: {},
					correlations: [],
					clusters: [],
					trends: [],
					outliers: [],
				};
			}
			break;

		case "word":
			try {
				const wordResult = analyzeWord(buffer, filename);
				dataInsights = wordResult.insights;
				extractedText = wordResult.text;
			} catch (error) {
				console.error("[ANALYZER] Failed to analyze Word:", error);
				dataInsights = {
					num_samples: 0,
					columns: [],
					statistics: {},
					correlations: [],
					clusters: [],
					trends: [],
					outliers: [],
				};
			}
			break;

		case "text":
			const textContent = buffer.toString("utf-8");
			const trimmedContent = textContent.trim();
			
			// FLEXIBLE: Try JSON first if it looks like JSON
			if (trimmedContent.startsWith("{") || trimmedContent.startsWith("[")) {
				try {
					const jsonData = JSON.parse(trimmedContent);
					console.log("[ANALYZER] Detected JSON in text file, parsing as JSON");
					dataInsights = analyzeJSON(jsonData);
					extractedText = JSON.stringify(jsonData, null, 2);
					break; // Exit switch early
				} catch (e) {
					// Not valid JSON, continue to CSV check
					console.log("[ANALYZER] Text file is not valid JSON, trying CSV");
				}
			}
			
			// Try to parse as CSV if it has CSV-like structure
			if (textContent.includes(",") && textContent.split("\n").length > 1) {
				dataInsights = analyzeCSV(textContent);
			} else {
				// Plain text analysis
				const wordCount = textContent.split(/\s+/).filter((w) => w.length > 0).length;
				dataInsights = {
					num_samples: 1,
					columns: ["word_count", "char_count", "line_count"],
					numeric_columns: ["word_count", "char_count", "line_count"],
					categorical_columns: [],
					statistics: {
						word_count: {
							type: "numeric",
							count: 1,
							mean: wordCount,
							min: wordCount,
							max: wordCount,
							median: wordCount,
							std: 0,
						},
						char_count: {
							type: "numeric",
							count: 1,
							mean: textContent.length,
							min: textContent.length,
							max: textContent.length,
							median: textContent.length,
							std: 0,
						},
						line_count: {
							type: "numeric",
							count: 1,
							mean: textContent.split("\n").length,
							min: textContent.split("\n").length,
							max: textContent.split("\n").length,
							median: textContent.split("\n").length,
							std: 0,
						},
					},
					correlations: [],
					clusters: [],
					trends: [],
					outliers: [],
				};
			}
			extractedText = textContent;
			break;

		default:
			// Unknown file type
			dataInsights = {
				num_samples: 0,
				columns: [],
				statistics: {},
				correlations: [],
				clusters: [],
				trends: [],
				outliers: [],
			};
	}

	return {
		fileType: fileInfo.type,
		dataInsights,
		extractedText,
		metadata,
	};
}

// Broadcast function will be passed as parameter
export type BroadcastFunction = (event: string, data: unknown) => void;