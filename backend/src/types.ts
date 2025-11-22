export type TrainShardRequest = {
	dataShard: string; // raw CSV content or JSON string for simplicity
	globalModelHash: string;
	epochCount: number;
	nodeId: string;
	randomSeed: number;
	// For encrypted shards
	encryptedData?: string; // JSON stringified encrypted data (if encrypted)
	sessionKey?: string; // Session key for decryption
	txBytes?: string; // Base64 encoded transaction bytes from encryption
	userAddress?: string; // User address for decryption
	// Zero-knowledge commit (coordinator sends commit hash, worker verifies after decrypt)
	commitHash?: string; // SHA256 commit hash for zero-knowledge verification
};

export type TrainUpdate = {
	nodeId: string;
	suiAddress?: string; // Sui address from worker keypair
	numSamples: number;
	deltaWeightsHash: string;
	weightsHash?: string; // Full SHA256 hash
	lossHistory: number[];
	logsCid?: string;
	startedAt: string;
	finishedAt: string;
	// Replay proof data
	epochLossHashes?: string[]; // Per-epoch loss hashes
	epochGradientNormHashes?: string[]; // Per-epoch gradient norm hashes
	randomChallengeSeed?: number; // Random challenge seed
	// Full audit log trace
	auditTrace?: Array<{
		event: string;
		timestamp: string;
		[key: string]: any;
	}>;
	// Data insights from original CSV analysis (not just training metrics)
	dataInsights?: {
		num_samples: number;
		columns: string[];
		numeric_columns?: string[];
		categorical_columns?: string[];
		statistics?: Record<string, any>;
		correlations?: Array<{ x: string; y: string; value: number }>;
		clusters?: Array<{ x: number; y: number; cluster: string; label: string }>;
		trends?: Array<{ metric: string; over: string; direction: string; change: number; data_points: any[] }>;
		outliers?: Array<{ column: string; row: number; value: number; deviation: number }>;
	};
	// Encrypted update (if worker encrypted before sending)
	encrypted?: boolean;
	encryptedUpdate?: {
		encrypted: boolean;
		data: string;
		encryption: string;
	};
	attestation: {
		signature: string;
		message: string;
		publicKey?: string; // Base64 encoded public key for cryptographic verification
		weightsHash?: string; // Attestation includes weights hash
		lossHistoryHash?: string; // Loss history hash
		signerPubKey?: string; // Alias for publicKey (production format)
		suiAddress?: string; // Sui address from worker
		hardwareInfo?: {
			cpu_cores?: number;
			cpu_physical_cores?: number;
			memory_gb?: number;
			platform?: string;
			processor?: string;
		};
		commitVerified?: {
			match: boolean;
			computedHash: string;
			commitHash: string;
			verified: boolean;
		};
	};
};

// New simplified types for direct analysis (no workers)
export interface AnalysisSummary {
	dataInsights: {
		num_samples: number;
		columns: string[];
		numeric_columns?: string[];
		categorical_columns?: string[];
		statistics?: Record<string, any>;
		correlations?: Array<{ x: string; y: string; value: number }>;
		clusters?: Array<{ x: number; y: number; cluster: string; label: string }>;
		trends?: Array<{
			metric: string;
			over: string;
			direction: string;
			change: number;
			data_points: Array<{ date: string; value: number }>;
		}>;
		outliers?: Array<{ column: string; row: number; value: number; deviation: number }>;
	};
	chartsData: {
		correlationMatrix: Array<{ x: string; y: string; value: number }>;
		trends: Array<{ date: string; value: number; label?: string }>;
		keyValueBarChart?: {
			title: string;
			data: Array<{ name: string; value: number }>;
		};
		clusters: Array<{ x: number; y: number; cluster: string; label: string }>;
		outliers: Array<{ column: string; row: number; value: number; deviation: number }>;
		summary: {
			total_samples: number;
			numeric_columns: number;
			categorical_columns: number;
			strong_correlations: number;
			outliers_count: number;
		};
	};
	// ✅ Optional: Sample data rows for LLM to generate charts from actual data
	sampleRows?: Array<Record<string, any>>; // First 50 rows of actual data
}

/**
 * Complete AuditPayload TypeScript Definition
 * This is the JSON structure stored in Walrus (encrypted with Seal)
 */
export interface AuditPayload {
	// File identification
	fileHash: string; // SHA256 hash of original file (0x...)
	fileName?: string; // Original filename
	fileSize?: number; // File size in bytes
	fileType?: string; // csv, json, image, pdf, word, text, unknown
	mimeType?: string; // MIME type (e.g., "text/csv", "application/pdf")
	
	// Analysis results
	analysisSummary: AnalysisSummary;
	
	// Chart configuration (for frontend rendering)
	chartsConfig: {
		correlationMatrix: Array<{ x: string; y: string; value: number }>;
		trends: Array<{ date: string; value: number }>;
		clusters: Array<{ x: number; y: number; cluster: string; label: string }>;
		outliers: Array<{ column: string; row: number; value: number; deviation: number }>;
	};
	
	// AI-generated insights (optional)
	llmInsights?: {
		title: string;
		summary: string;
		keyFindings?: string[];
		recommendations?: string[];
		chartRecommendations?: string[]; // e.g., "scatter income vs score", "line chart revenue over time"
	};
	
	// Metadata
	generatedAt: string; // ISO 8601 timestamp
	version: string; // Audit payload version (e.g., "v1")
	
	// File-specific metadata
	metadata?: {
		// Image metadata
		width?: number;
		height?: number;
		format?: string;
		hasAlpha?: boolean;
		// Or other file-specific metadata
		[key: string]: any;
	};
	
	// Extracted text (for PDF, Word, text files)
	extractedText?: string; // First N characters of extracted text (truncated for storage)
	
	// Privacy & encryption info
	encrypted?: boolean; // Whether this payload is encrypted with Seal
	encryptionInfo?: {
		encryptedAt?: string; // When encryption was applied
		userAddress?: string; // User address used for encryption
	};
}

/**
 * Complete API Response from /api/upload
 * Includes all necessary data for frontend display
 */
export interface AnalysisResult {
	// Walrus storage - FILE (binary blob) - uploaded ONCE
	blobId: string; // Walrus blob ID for FILE (binary: images, videos, PDF, JSON, CSV, etc.)
	walrusScanUrl?: string; // URL to view file blob on Walrus Scan
	
	// Sui blockchain
	suiTx: string; // Sui transaction hash
	suiExplorerUrl?: string; // URL to view transaction on Sui Explorer
	
	// Analysis results
	analysisSummary: AnalysisSummary; // Complete analysis summary (dataInsights + chartsData)
	
	// AI insights
	llmInsights?: {
		title: string;
		summary: string;
		keyFindings?: string[];
		recommendations?: string[];
		chartRecommendations?: string[];
	};
	
	// File info
	fileHash: string; // SHA256 hash of original file
	fileName?: string; // Original filename
	fileType?: string; // File type (csv, json, image, pdf, word, text)
	
	// Chart data (for frontend rendering)
	chartData: AnalysisSummary["chartsData"];
}

// Legacy types (kept for backward compatibility if needed)
export type AggregationResult = {
	globalModelHash: string;
	updates: TrainUpdate[];
	aggregatedAt: string;
	insight: {
		title: string;
		summary: string;
		keyFindings?: string[]; // AI-generated key findings
		recommendations?: string[]; // AI-generated recommendations
		metrics: Record<string, number>;
		charts: {
			type: "correlation" | "outliers" | "trend";
			cid?: string;
		}[];
		visualizationHints?: {
			correlation?: string[];
			trends?: string[];
			clusters?: string[];
		};
		// Actual chart data from CSV analysis (not mock)
		chartData?: {
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
	};
	proof: {
		walrusCid: string;
		suiTxHash: string;
	};
};

