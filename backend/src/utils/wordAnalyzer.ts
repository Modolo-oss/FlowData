/**
 * Word Document Analyzer
 * Extracts text from Word documents (.doc, .docx)
 * Note: For full Word parsing, consider using mammoth (for .docx)
 */

import { DataInsights } from "./csvAnalyzer.js";

export function analyzeWord(buffer: Buffer, filename: string): {
	text: string;
	insights: DataInsights;
} {
	let text = "";

	try {
		// Check if it's .docx (ZIP-based format)
		if (filename.endsWith(".docx") || (buffer[0] === 0x50 && buffer[1] === 0x4b)) {
			// DOCX is a ZIP file containing XML
			// Basic extraction: look for readable text in the ZIP
			const zipContent = buffer.toString("latin1");
			
			// Look for XML content (Word documents contain XML)
			const xmlMatches = zipContent.match(/<[^>]+>[\s\S]*?<\/[^>]+>/g) || [];
			
			for (const xml of xmlMatches) {
				// Extract text from XML tags
				const textMatches = xml.match(/>([^<]+)</g) || [];
				for (const match of textMatches) {
					const extracted = match.replace(/[<>]/g, "").trim();
					if (extracted.length > 1 && !extracted.startsWith("?")) {
						text += extracted + " ";
					}
				}
			}
			
			// Fallback: extract any readable text
			if (text.length < 50) {
				const readableText = zipContent
					.replace(/[^\x20-\x7E\n\r]/g, " ")
					.replace(/\s+/g, " ")
					.trim();
				text = readableText.substring(0, 5000);
			}
		} else {
			// .doc format (binary, harder to parse)
			// Basic extraction: look for readable text
			const docContent = buffer.toString("latin1");
			const readableText = docContent
				.replace(/[^\x20-\x7E\n\r]/g, " ")
				.replace(/\s+/g, " ")
				.trim();
			text = readableText.substring(0, 5000);
		}
	} catch (error) {
		console.warn("[WORD] Failed to extract text:", error);
		text = "Word document text extraction failed";
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


