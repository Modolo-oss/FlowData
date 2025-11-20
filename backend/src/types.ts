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

