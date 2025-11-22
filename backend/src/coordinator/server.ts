/**
 * NEW SIMPLIFIED SERVER - Direct Analysis (No Workers)
 * Flow: Upload CSV -> Analyze -> LLM -> Walrus -> Sui -> Response
 */

import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "crypto";
import { AnalysisResult, AuditPayload, AnalysisSummary } from "../types.js";
import { storeToWalrus, readFromWalrus } from "../proofs/walrus.js";
import { recordOnSui } from "../proofs/sui.js";
import { config } from "../config.js";
import { generateInsightFromAnalysis } from "../services/llm-new.js";
import { analyzeFile } from "../utils/fileAnalyzer.js";
import { generateChartsFromDataInsights, convertLLMChartsToChartsData } from "../utils/chartGenerator.js";
import { encryptAuditPayload } from "../proofs/seal-audit.js";

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
		
		console.log(`[UPLOAD] Analysis result:`, {
			fileType: fileAnalysis.fileType,
			num_samples: dataInsights.num_samples,
			columns: dataInsights.columns.length,
			hasStatistics: !!dataInsights.statistics && Object.keys(dataInsights.statistics).length > 0,
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
					chartsData: generateChartsFromDataInsights(dataInsights), // Temporary fallback structure
				},
				userPrompt: prompt,
			});
			
			// ✅ Use LLM-generated charts if available
			if (llmInsights.charts && Object.keys(llmInsights.charts).length > 0) {
				console.log("[CHARTS] ✅ Using LLM-generated charts!");
				chartsData = convertLLMChartsToChartsData(llmInsights.charts, dataInsights);
			} else {
				console.log("[CHARTS] ⚠️ No LLM charts, using fallback");
				chartsData = generateChartsFromDataInsights(dataInsights);
			}
		} catch (err: any) {
			console.warn("[LLM] Failed to generate insights:", err?.message || err);
			// Fallback to hardcoded charts (but this shouldn't happen if LLM works)
			chartsData = generateChartsFromDataInsights(dataInsights);
		}

		// ✅ SIMPLE FLOW: Return hasil DULU, Walrus + Sui di background (tidak blocking)
		broadcast("status", { stage: "complete", message: "Analysis complete!", progress: 100 });
		broadcast("progress", { stage: "complete", message: "Analysis complete!", progress: 100 });
		
		// Return hasil LANGSUNG ke user (tidak tunggu Walrus + Sui)
		const result: AnalysisResult = {
			blobId: "", // Will be updated in background
			suiTx: "", // Will be updated in background
			analysisSummary: {
				dataInsights,
				chartsData,
			},
			llmInsights,
			fileHash: `0x${fileHash}`,
			fileName: req.file.originalname,
			fileType: fileAnalysis.fileType,
			chartData: chartsData,
		};

		broadcast("complete", { result });

		// Return response LANGSUNG (user tidak perlu tunggu)
		res.json({ success: true, result });

		// ✅ BACKGROUND: Upload ke Walrus + Record Sui (tidak blocking response)
		(async () => {
			try {
				broadcast("status", { stage: "uploading_walrus", message: "Storing file...", progress: 100 });
				
				// Upload ke Walrus
				console.log(`[WALRUS] Uploading FILE (${req.file.originalname}) to Walrus...`);
				const walrusResult = await storeToWalrus(req.file.buffer);
				const blobId = walrusResult.blobId;
				console.log(`[WALRUS] ✅ File uploaded: ${blobId}`);

				// Record ke Sui
				const suiResult = await recordOnSui({
					walrusCid: blobId || "",
					participants: userAddress ? [userAddress] : [],
					fileHash: `0x${fileHash}`,
					metadata: {
						fileName: req.file.originalname,
						fileSize: req.file.size,
						fileType: fileAnalysis.fileType,
						num_samples: dataInsights.num_samples,
						columns: dataInsights.columns.length,
					},
				});

				// Update broadcast dengan blobId & suiTx (jika client masih connected)
				broadcast("update", {
					blobId,
					suiTx: suiResult.txHash,
					walrusScanUrl: walrusResult.walrusScanUrl,
					suiExplorerUrl: `https://suiexplorer.com/txblock/${suiResult.txHash}?network=testnet`,
				});
			} catch (err: any) {
				console.error("[BACKGROUND] Failed to store to Walrus/Sui:", err?.message || err);
				// Tidak perlu broadcast error - user sudah dapat hasil analysis
			}
		})();
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

app.listen(PORT, () => {
	console.log(`[COORDINATOR] Server running on port ${PORT}`);
	console.log(`[COORDINATOR] NEW FLOW: Direct Analysis (No Workers)`);
});

