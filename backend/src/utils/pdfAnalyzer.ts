/**
 * PDF Analyzer
 * Extracts text from PDF files
 * Note: For full PDF parsing, consider using pdf-parse or pdfjs-dist
 */

import { DataInsights } from "./csvAnalyzer.js";

export function analyzePDF(buffer: Buffer): {
	text: string;
	insights: DataInsights;
} {
	// Basic PDF text extraction (simplified)
	// For production, use a proper PDF library like pdf-parse
	let text = "";
	
	try {
		// Simple extraction: look for text streams in PDF
		// This is a basic implementation - for production use pdf-parse
		const pdfText = buffer.toString("latin1");
		
		// Extract text between stream markers (basic approach)
		const streamRegex = /stream[\s\S]*?endstream/g;
		const streams = pdfText.match(streamRegex) || [];
		
		for (const stream of streams) {
			// Try to extract readable text (basic filtering)
			const cleanStream = stream
				.replace(/stream|endstream/g, "")
				.replace(/[^\x20-\x7E\n\r]/g, " ") // Keep printable ASCII
				.replace(/\s+/g, " ")
				.trim();
			
			if (cleanStream.length > 10) {
				text += cleanStream + "\n";
			}
		}
		
		// Fallback: extract any readable text from the PDF
		if (text.length < 50) {
			const readableText = pdfText
				.replace(/[^\x20-\x7E\n\r]/g, " ")
				.replace(/\s+/g, " ")
				.trim();
			
			// Take first 5000 characters
			text = readableText.substring(0, 5000);
		}
	} catch (error) {
		console.warn("[PDF] Failed to extract text:", error);
		text = "PDF text extraction failed";
	}

	// Create insights from extracted text
	const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
	const charCount = text.length;
	const lineCount = text.split("\n").length;

	const columns = ["word_count", "char_count", "line_count"];
	const statistics: Record<string, any> = {
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
			mean: charCount,
			min: charCount,
			max: charCount,
			median: charCount,
			std: 0,
		},
		line_count: {
			type: "numeric",
			count: 1,
			mean: lineCount,
			min: lineCount,
			max: lineCount,
			median: lineCount,
			std: 0,
		},
	};

	const insights: DataInsights = {
		num_samples: 1,
		columns,
		numeric_columns: columns,
		categorical_columns: [],
		statistics,
		correlations: [],
		clusters: [],
		trends: [],
		outliers: [],
	};

	return { text, insights };
}


