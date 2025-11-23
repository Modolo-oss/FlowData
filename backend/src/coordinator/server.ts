/**
 * NEW SIMPLIFIED SERVER - Direct Analysis (No Workers)
 * Flow: Upload CSV -> Analyze -> LLM -> Walrus -> Sui -> Response
 */

import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "crypto";
import { AnalysisResult, AuditPayload, AnalysisSummary } from "../types.js";
import { storeToWalrus, readFromWalrus, readBinaryFileFromWalrus } from "../proofs/walrus.js";
import { recordOnSui } from "../proofs/sui.js";
import { config } from "../config.js";
import { generateInsightFromAnalysis } from "../services/llm-new.js";
import { analyzeFile } from "../utils/fileAnalyzer.js";
import { convertLLMChartsToChartsData } from "../utils/chartGenerator.js";
import { encryptAuditPayload, encryptFile, decryptFile } from "../proofs/seal-audit.js";

const PORT = config.coordinatorPort;

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
});

// Simple in-memory event stream for SSE progress
type Client = { id: number; res: express.Response; keepalive: NodeJS.Timeout | null };
let clients: Client[] = [];
let clientSeq = 1;
const progressBuffer: { event: string; data: unknown }[] = [];
const PROGRESS_MAX = 200;
const KEEPALIVE_INTERVAL = 15000; // 15 seconds

function broadcast(event: string, data: unknown) {
	const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
	const activeClients: Client[] = [];
	for (const c of clients) {
		try {
			if (!c.res.destroyed && !c.res.closed) {
				c.res.write(payload);
				activeClients.push(c);
			} else {
				if (c.keepalive) clearInterval(c.keepalive);
			}
		} catch (err) {
			if (c.keepalive) clearInterval(c.keepalive);
		}
	}
	clients = activeClients;

	// Store in buffer for replay
	progressBuffer.push({ event, data });
	if (progressBuffer.length > PROGRESS_MAX) {
		progressBuffer.shift();
	}
}

// Health check
app.get("/api/health", (_req, res) => {
	return res.json({ ok: true, port: PORT });
});

// SSE Progress stream
app.get("/api/progress", (req, res) => {
	res.set({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		"Connection": "keep-alive",
		"X-Accel-Buffering": "no",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Cache-Control",
	});
	res.flushHeaders();

	const id = clientSeq++;
	try {
		res.write(`: connected\n\n`);
	} catch (err) {
		return;
	}

	const keepalive = setInterval(() => {
		try {
			if (!res.destroyed && !res.closed) {
				res.write(`: keepalive\n\n`);
			} else {
				clearInterval(keepalive);
			}
		} catch (err) {
			clearInterval(keepalive);
		}
	}, KEEPALIVE_INTERVAL);

	const client: Client = { id, res, keepalive };
	clients.push(client);

	// Replay recent progress
	for (const evt of progressBuffer) {
		try {
			if (!res.destroyed && !res.closed) {
				res.write(`event: ${evt.event}\ndata: ${JSON.stringify(evt.data)}\n\n`);
			}
		} catch (err) {
			break;
		}
	}

	const cleanup = () => {
		clearInterval(keepalive);
		clients = clients.filter((c) => c.id !== id);
	};

	req.on("close", cleanup);
	req.on("aborted", cleanup);

	try {
		if (!res.destroyed && !res.closed) {
			broadcast("status", {
				stage: "idle",
				message: "Connected to progress stream",
				connected: true,
			});
		}
	} catch (err) {
		// Ignore
	}
});

// NEW UPLOAD ENDPOINT - Direct Analysis (No Workers)
app.post("/api/upload", upload.single("file"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "file is required" });
		}

		const prompt = (req.body?.prompt as string) || "";
		const userAddress = (req.body?.userAddress as string) || "";
		const sessionKey = (req.body?.sessionKey as string) || "";

		// ✅ PRIVACY: Require wallet connection for encryption
		if (!userAddress) {
			return res.status(400).json({ error: "Wallet connection required. Please connect your Sui wallet to enable file encryption." });
		}

		broadcast("status", { stage: "validating", message: "Validating file...", progress: 5 });
		broadcast("progress", { stage: "validating", message: "Validating file...", progress: 5 });

		// Detect file type and analyze
		const fileHash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
		
		broadcast("status", { stage: "detecting", message: "Detecting file type...", progress: 10 });
		broadcast("progress", { stage: "detecting", message: "Detecting file type...", progress: 10 });

		// Analyze file (supports CSV, JSON, images, PDF, Word, text)
		console.log(`[UPLOAD] File received: ${req.file.originalname}, size: ${req.file.size} bytes`);
		const fileAnalysis = analyzeFile(req.file.buffer, req.file.originalname, broadcast);
		const dataInsights = fileAnalysis.dataInsights;
		const sampleRows = fileAnalysis.sampleRows; // ✅ Extract sample rows for LLM
		
		console.log(`[UPLOAD] Analysis result:`, {
			fileType: fileAnalysis.fileType,
			num_samples: dataInsights.num_samples,
			columns: dataInsights.columns.length,
			hasStatistics: !!dataInsights.statistics && Object.keys(dataInsights.statistics).length > 0,
			sampleRowsCount: sampleRows?.length || 0,
		});
		
		if (dataInsights.num_samples === 0) {
			console.warn(`[UPLOAD] ⚠️ WARNING: Analysis resulted in 0 samples!`);
			console.warn(`[UPLOAD] File type: ${fileAnalysis.fileType}`);
			console.warn(`[UPLOAD] File size: ${req.file.size} bytes`);
			console.warn(`[UPLOAD] Columns detected: ${dataInsights.columns.length}`);
			console.warn(`[UPLOAD] File preview (first 500 chars):`, req.file.buffer.toString("utf-8").substring(0, 500));
		}
		
		// ✅ NEW FLOW: LLM generates charts, not hardcoded logic!
		broadcast("status", { stage: "llm_analysis", message: "Generating AI insights and charts...", progress: 60 });
		broadcast("progress", { stage: "llm_analysis", message: "Generating AI insights and charts...", progress: 60 });

		// Generate LLM insights + charts (LLM is smart, it will generate relevant charts)
		let llmInsights;
		let chartsData;
		try {
			llmInsights = await generateInsightFromAnalysis({
				analysisSummary: {
					dataInsights,
					chartsData: {
						correlationMatrix: [],
						trends: [],
						clusters: [],
						outliers: [],
						summary: {
							total_samples: dataInsights.num_samples,
							numeric_columns: dataInsights.numeric_columns?.length || 0,
							categorical_columns: dataInsights.categorical_columns?.length || 0,
							strong_correlations: 0,
							outliers_count: dataInsights.outliers?.length || 0,
						},
					},
					sampleRows: sampleRows, // ✅ Pass actual data content to LLM!
				},
				userPrompt: prompt,
			});
			
			// ✅ LLM-ONLY: Use LLM-generated charts ONLY - NO FALLBACK!
			if (llmInsights.charts && Object.keys(llmInsights.charts).length > 0) {
				console.log("[CHARTS] ✅ Using LLM-generated charts!");
				chartsData = convertLLMChartsToChartsData(llmInsights.charts, dataInsights);
			} else {
				console.log("[CHARTS] ⚠️ No LLM charts generated - returning empty charts (NO FALLBACK)");
				// ✅ NO FALLBACK - return empty charts if LLM doesn't generate
				chartsData = {
					correlationMatrix: [],
					trends: [],
					clusters: [],
					outliers: dataInsights.outliers || [],
					summary: {
						total_samples: dataInsights.num_samples,
						numeric_columns: dataInsights.numeric_columns?.length || 0,
						categorical_columns: dataInsights.categorical_columns?.length || 0,
						strong_correlations: 0,
						outliers_count: dataInsights.outliers?.length || 0,
					},
				};
			}
		} catch (err: any) {
			console.error("[LLM] ❌ Failed to generate insights:", err?.message || err);
			// ✅ NO FALLBACK - return empty charts if LLM fails
			llmInsights = {
				title: "Data Analysis",
				summary: "Failed to generate AI insights. Please check your OpenRouter API key configuration.",
				keyFindings: [],
				recommendations: [],
				chartRecommendations: [],
				charts: {},
			};
			chartsData = {
				correlationMatrix: [],
				trends: [],
				clusters: [],
				outliers: dataInsights.outliers || [],
				summary: {
					total_samples: dataInsights.num_samples,
					numeric_columns: dataInsights.numeric_columns?.length || 0,
					categorical_columns: dataInsights.categorical_columns?.length || 0,
					strong_correlations: 0,
					outliers_count: dataInsights.outliers?.length || 0,
				},
			};
		}

		// ✅ PRIVACY: Encrypt file BEFORE response (so txBytes is available immediately)
		console.log(`[SEAL] Encrypting file with Seal (user: ${userAddress})...`);
		const encryptionResult = await encryptFile(req.file.buffer, userAddress);
		const encryptedFileBuffer = encryptionResult.encryptedData;
		const txBytes = encryptionResult.txBytes;
		console.log(`[SEAL] ✅ File encrypted (${req.file.buffer.length} -> ${encryptedFileBuffer.length} bytes)`);

		// ✅ SIMPLE FLOW: Return hasil DULU, Walrus + Sui di background (tidak blocking)
		broadcast("status", { stage: "complete", message: "Analysis complete!", progress: 100 });
		broadcast("progress", { stage: "complete", message: "Analysis complete!", progress: 100 });
		
		// Return hasil LANGSUNG ke user (tidak tunggu Walrus + Sui)
			const result: AnalysisResult = {
			blobId: "", // Will be updated after frontend uploads to Walrus
			suiTx: "", // Will be updated after frontend uploads to Walrus
			analysisSummary: {
				dataInsights,
				chartsData,
			},
			llmInsights,
			fileHash: `0x${fileHash}`,
			fileName: req.file.originalname,
			fileType: fileAnalysis.fileType,
			chartData: chartsData,
			sealEncrypted: true, // File is encrypted with Seal
			txBytes, // txBytes available immediately for decryption
			encryptedFileData: encryptedFileBuffer.toString('base64'), // Base64 encoded encrypted file for frontend upload
			encryptedFileSize: encryptedFileBuffer.length,
		};

		broadcast("complete", { result });

		// Return response LANGSUNG (user tidak perlu tunggu)
		res.json({ success: true, result });

			// ✅ BACKGROUND: Walrus upload akan dilakukan di frontend dengan wallet user signing
			// Backend hanya return encrypted file untuk frontend upload
			console.log(`[WALRUS] Encrypted file ready for upload via wallet user signing`);
			console.log(`[WALRUS] Frontend will upload to Walrus with wallet user, then call /api/record-walrus-upload`);
			// Frontend akan upload ke Walrus dengan wallet user, lalu call endpoint untuk record
	} catch (error: any) {
		console.error("[UPLOAD] Error:", error?.message || error);
		broadcast("error", { message: error?.message || "Upload failed" });
		return res.status(500).json({ error: error?.message || "Upload failed" });
	}
});

/**
 * REGENERATE INSIGHTS ENDPOINT
 * Regenerate AI insights with new prompt without re-analyzing the file
 * 
 * Flow:
 * 1. Get blobId from request
 * 2. Fetch encrypted payload from Walrus
 * 3. Decrypt using Seal
 * 4. Extract analysisSummary (chart data stays the same)
 * 5. Generate new insights with new prompt
 * 6. Return updated llmInsights
 */
app.post("/api/regenerate-insights", async (req, res) => {
	try {
		const { blobId, prompt, sessionKey } = req.body;

		if (!blobId) {
			return res.status(400).json({ error: "blobId is required" });
		}

		console.log(`[REGENERATE] Starting regeneration for blobId: ${blobId}`);
		console.log(`[REGENERATE] New prompt: ${prompt || "(none)"}`);

		// Step 1: Fetch encrypted payload from Walrus
		console.log(`[REGENERATE] Fetching blob from Walrus...`);
		const walrusResult = await readFromWalrus(blobId, sessionKey);
		const storedPayload = walrusResult.data;

		// Step 2: Extract analysisSummary from decrypted payload
		// readFromWalrus already decrypts if encrypted, so storedPayload is the AuditPayload
		let auditPayload: AuditPayload;
		
		// readFromWalrus returns { data: AuditPayload, metadata, encrypted }
		// The data field is already the decrypted AuditPayload
		if (walrusResult.data && typeof walrusResult.data === 'object') {
			if (walrusResult.data.fileHash && walrusResult.data.analysisSummary) {
				// Already in AuditPayload format
				auditPayload = walrusResult.data as AuditPayload;
			} else if (walrusResult.data.encrypted && walrusResult.data.data) {
				// Still encrypted, decrypt it
				const { decryptAuditPayload } = await import("../proofs/seal-audit.js");
				auditPayload = await decryptAuditPayload(
					walrusResult.data.data,
					walrusResult.data.txBytes || "",
					sessionKey
				) as AuditPayload;
			} else {
				// Try to use as-is
				auditPayload = walrusResult.data as AuditPayload;
			}
		} else {
			return res.status(400).json({ error: "Invalid payload format from Walrus" });
		}

		if (!auditPayload.analysisSummary) {
			return res.status(400).json({ error: "Invalid payload: missing analysisSummary" });
		}

		console.log(`[REGENERATE] ✅ Extracted analysisSummary from blob`);
		console.log(`[REGENERATE]   - Samples: ${auditPayload.analysisSummary.dataInsights.num_samples}`);
		console.log(`[REGENERATE]   - Columns: ${auditPayload.analysisSummary.dataInsights.columns.length}`);

		// Step 3: Generate new insights with new prompt
		console.log(`[REGENERATE] Generating new insights with LLM...`);
		const newInsights = await generateInsightFromAnalysis({
			analysisSummary: auditPayload.analysisSummary,
			userPrompt: prompt || undefined,
		});

		console.log(`[REGENERATE] ✅ Generated new insights`);
		console.log(`[REGENERATE]   - Title: ${newInsights.title}`);
		console.log(`[REGENERATE]   - Key Findings: ${newInsights.keyFindings?.length || 0}`);
		console.log(`[REGENERATE]   - Chart Recommendations: ${newInsights.chartRecommendations?.length || 0}`);

		// Step 4: Return updated insights
		const response = {
			llmInsights: newInsights,
			chartRecommendations: newInsights.chartRecommendations || [],
			updatedAt: new Date().toISOString(),
			// Include original chart data (unchanged)
			chartData: auditPayload.analysisSummary.chartsData,
			analysisSummary: auditPayload.analysisSummary,
		};

		return res.json({ success: true, result: response });
	} catch (error: any) {
		console.error("[REGENERATE] Error:", error?.message || error);
		return res.status(500).json({ error: error?.message || "Failed to regenerate insights" });
	}
});

/**
 * Download/View Original File from Walrus
 * GET /api/download-file?blobId=xxx&fileName=xxx
 * Returns binary file with proper Content-Type headers
 */
app.get("/api/download-file", async (req, res) => {
	try {
		const { blobId, fileName, txBytes, sessionKey } = req.query;

		if (!blobId || typeof blobId !== "string") {
			return res.status(400).json({ error: "blobId is required" });
		}

		console.log(`[DOWNLOAD] Downloading file: ${blobId}`);

		// Read encrypted binary file from Walrus
		const fileData = await readBinaryFileFromWalrus(blobId);

		// ✅ PRIVACY: Decrypt file with Seal if txBytes provided
		let decryptedFile: Buffer;
		if (txBytes && typeof txBytes === "string") {
			console.log(`[SEAL] Decrypting file with Seal...`);
			const sealSessionKey = sessionKey && typeof sessionKey === "string" ? sessionKey : undefined;
			decryptedFile = await decryptFile(Buffer.from(fileData.data), txBytes, sealSessionKey);
			console.log(`[SEAL] ✅ File decrypted (${fileData.size} -> ${decryptedFile.length} bytes)`);
		} else {
			// No encryption (fallback for old files)
			console.log(`[DOWNLOAD] ⚠️ No txBytes provided, returning encrypted file (user needs to decrypt)`);
			decryptedFile = Buffer.from(fileData.data);
		}

		// Determine MIME type from fileName or default to application/octet-stream
		let mimeType = "application/octet-stream";
		if (fileName && typeof fileName === "string") {
			const ext = fileName.toLowerCase().split(".").pop();
			const mimeTypes: Record<string, string> = {
				csv: "text/csv",
				json: "application/json",
				txt: "text/plain",
				pdf: "application/pdf",
				doc: "application/msword",
				docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				png: "image/png",
				jpg: "image/jpeg",
				jpeg: "image/jpeg",
				gif: "image/gif",
				webp: "image/webp",
			};
			mimeType = mimeTypes[ext || ""] || mimeType;
		}

		// Set headers for file download
		res.setHeader("Content-Type", mimeType);
		res.setHeader("Content-Length", decryptedFile.length.toString());
		if (fileName && typeof fileName === "string") {
			res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
		}

		// Send decrypted binary data
		res.send(decryptedFile);

		console.log(`[DOWNLOAD] ✅ File sent: ${blobId}, size: ${decryptedFile.length} bytes, type: ${mimeType}`);
	} catch (error: any) {
		console.error("[DOWNLOAD] Error:", error?.message || error);
		res.status(500).json({ error: error?.message || "Failed to download file" });
	}
});

/**
 * Record Walrus upload after frontend uploads with wallet user
 * Frontend calls this after successfully uploading encrypted file to Walrus
 */
app.post("/api/record-walrus-upload", async (req, res) => {
	try {
		const { blobId, fileHash, fileName, fileSize, fileType, userAddress, num_samples, columns } = req.body;

		if (!blobId) {
			return res.status(400).json({ error: "blobId is required" });
		}

		if (!userAddress) {
			return res.status(400).json({ error: "userAddress is required" });
		}

		console.log(`[WALRUS] Recording Walrus upload (blobId: ${blobId}, user: ${userAddress})`);

		// Record ke Sui
		const suiResult = await recordOnSui({
			walrusCid: blobId,
			participants: [userAddress],
			fileHash: fileHash || "",
			metadata: {
				fileName: fileName || "",
				fileSize: fileSize || 0,
				fileType: fileType || "",
				num_samples: num_samples || 0,
				columns: columns || 0,
			},
		});

		const network = config.suiNetwork as "mainnet" | "testnet" | "devnet" | "localnet";
		const walrusScanUrl = `https://scan.walrus.space/${network}/blob/${blobId}`;
		const suiExplorerUrl = `https://suiexplorer.com/txblock/${suiResult.txHash}?network=${network}`;

		console.log(`[WALRUS] ✅ Recorded Walrus upload:`);
		console.log(`[WALRUS]   - Blob ID: ${blobId}`);
		console.log(`[WALRUS]   - Sui TX: ${suiResult.txHash}`);
		console.log(`[WALRUS]   - User: ${userAddress}`);

		// Broadcast update (if client still connected)
		broadcast("update", {
			blobId,
			suiTx: suiResult.txHash,
			walrusScanUrl,
			suiExplorerUrl,
			sealEncrypted: true,
		});

		res.json({
			success: true,
			blobId,
			suiTx: suiResult.txHash,
			walrusScanUrl,
			suiExplorerUrl,
		});
	} catch (error: any) {
		console.error("[RECORD-WALRUS] Error:", error?.message || error);
		res.status(500).json({ error: error?.message || "Failed to record Walrus upload" });
	}
});

app.listen(PORT, () => {
	console.log(`[COORDINATOR] Server running on port ${PORT}`);
	console.log(`[COORDINATOR] NEW FLOW: Direct Analysis (No Workers)`);
});

