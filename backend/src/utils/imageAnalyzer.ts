/**
 * Image Analyzer
 * Extracts metadata and basic statistics from images
 */

import { DataInsights } from "./csvAnalyzer.js";

export interface ImageMetadata {
	width?: number;
	height?: number;
	format?: string;
	size: number;
	hasAlpha?: boolean;
}

export function analyzeImage(buffer: Buffer, filename: string): {
	metadata: ImageMetadata;
	insights: DataInsights;
} {
	const size = buffer.length;
	
	// Basic image detection
	let width: number | undefined;
	let height: number | undefined;
	let format: string | undefined;
	let hasAlpha: boolean | undefined;

	// Try to extract dimensions from common formats
	// PNG
	if (buffer[0] === 0x89 && buffer[1] === 0x50) {
		format = "png";
		if (buffer.length >= 24) {
			width = buffer.readUInt32BE(16);
			height = buffer.readUInt32BE(20);
			hasAlpha = buffer[25] === 6 || buffer[25] === 4;
		}
	}
	// JPEG
	else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
		format = "jpeg";
		// JPEG dimensions are in SOF markers, harder to extract
		// For now, we'll leave them undefined
	}
	// GIF
	else if (buffer[0] === 0x47 && buffer[1] === 0x49) {
		format = "gif";
		if (buffer.length >= 10) {
			width = buffer.readUInt16LE(6);
			height = buffer.readUInt16LE(8);
		}
	}

	const metadata: ImageMetadata = {
		width,
		height,
		format,
		size,
		hasAlpha,
	};

	// Create insights from metadata
	const columns = ["width", "height", "size", "format"];
	const statistics: Record<string, any> = {};

	if (width !== undefined) {
		statistics.width = {
			type: "numeric",
			count: 1,
			mean: width,
			min: width,
			max: width,
			median: width,
			std: 0,
		};
	}

	if (height !== undefined) {
		statistics.height = {
			type: "numeric",
			count: 1,
			mean: height,
			min: height,
			max: height,
			median: height,
			std: 0,
		};
	}

	statistics.size = {
		type: "numeric",
		count: 1,
		mean: size,
		min: size,
		max: size,
		median: size,
		std: 0,
	};

	if (format) {
		statistics.format = {
			type: "categorical",
			count: 1,
			unique: 1,
			top_values: { [format]: 1 },
		};
	}

	const insights: DataInsights = {
		num_samples: 1,
		columns,
		numeric_columns: width !== undefined || height !== undefined ? ["width", "height", "size"] : ["size"],
		categorical_columns: format ? ["format"] : [],
		statistics,
		correlations: [],
		clusters: [],
		trends: [],
		outliers: [],
	};

	return { metadata, insights };
}


