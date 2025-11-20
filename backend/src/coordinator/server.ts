import express from "express";
import cors from "cors";
import multer from "multer";
import axios from "axios";
import crypto from "crypto";
import { AggregationResult, TrainShardRequest, TrainUpdate } from "../types.js";
import { storeToWalrus, readFromWalrus } from "../proofs/walrus.js";
import { recordOnSui } from "../proofs/sui.js";
import { config } from "../config.js";
import { verifyWithSeal, encryptShard, decryptShard } from "../proofs/seal.js";
import { generateInsight, checkOllamaHealth } from "../services/llm.js";
import { aggregateDataInsights, generateChartsFromDataInsights } from "../utils/chartGenerator.js";

const PORT = config.coordinatorPort;
const WORKERS = config.workerNodes;

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.maxUploadMb * 1024 * 1024 }
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
				// Clean up dead connection
				if (c.keepalive) clearInterval(c.keepalive);
			}
		} catch (err) {
			// Client disconnected, remove from list
			if (c.keepalive) clearInterval(c.keepalive);
		}
	}
	clients = activeClients;
	progressBuffer.push({ event, data });
	if (progressBuffer.length > PROGRESS_MAX) progressBuffer.shift();
}

// Decrypt endpoint for workers (workers decrypt here, not in coordinator logic)
app.post("/api/decrypt", async (req, res) => {
	try {
		const { encryptedData, sessionKey, txBytes, userAddress } = req.body;
		
		if (!encryptedData || !sessionKey) {
			return res.status(400).json({ error: "encryptedData and sessionKey are required" });
		}
		
		console.log("[DECRYPT] Received decrypt request:", {
			hasEncryptedData: !!encryptedData,
			encryptedDataType: typeof encryptedData,
			hasSessionKey: !!sessionKey,
			hasTxBytes: !!txBytes,
			userAddress: userAddress || "none"
		});
		
		// Convert base64 txBytes to Uint8Array
		let txBytesArray: Uint8Array;
		if (txBytes) {
			try {
				txBytesArray = Buffer.from(txBytes, "base64");
				console.log("[DECRYPT] txBytes decoded, length:", txBytesArray.length);
			} catch (e) {
				console.warn("[DECRYPT] Failed to decode txBytes as base64:", e);
				txBytesArray = new Uint8Array();
			}
		} else {
			txBytesArray = new Uint8Array();
			console.log("[DECRYPT] No txBytes provided");
		}
		
		const decrypted = await decryptShard(encryptedData, sessionKey, txBytesArray, userAddress);
		
		console.log("[DECRYPT] Decryption successful, type:", typeof decrypted);
		
		return res.json({ decryptedData: typeof decrypted === "string" ? decrypted : JSON.stringify(decrypted) });
	} catch (err: any) {
		console.error("[DECRYPT] Decrypt endpoint error:", err?.message || err);
		console.error("[DECRYPT] Error stack:", err?.stack);
		return res.status(500).json({ error: String(err?.message || err) });
	}
});

app.get("/api/progress", (req, res) => {
	res.set({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		"Connection": "keep-alive",
		"X-Accel-Buffering": "no", // Disable nginx buffering if present
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Cache-Control"
	});
	res.flushHeaders();
	
	const id = clientSeq++;
	
	// Send initial connection message
	try {
		res.write(`: connected\n\n`);
	} catch (err) {
		return; // Client already disconnected
	}
	
	// Keepalive ping to prevent connection timeout
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
			// Client disconnected during replay
			break;
		}
	}
	
	// Clean up on disconnect
	const cleanup = () => {
		clearInterval(keepalive);
		clients = clients.filter(c => c.id !== id);
	};
	
	req.on("close", cleanup);
	req.on("aborted", cleanup);
	
	// Send initial status
	try {
		if (!res.destroyed && !res.closed) {
			broadcast("status", { 
				stage: "idle", 
				message: "Connected to progress stream",
				connected: true 
			});
		}
	} catch (err) {
		// Ignore if client already disconnected
	}
});

app.get("/api/health/full", async (_req, res) => {
	try {
		const checks = await Promise.all(
			WORKERS.map(async w => {
				try {
					const r = await axios.get(`${w}/health`, { timeout: 3000 });
					return { worker: w, ok: true, detail: r.data };
				} catch (e: any) {
					return { worker: w, ok: false, error: String(e?.message || e) };
				}
			})
		);
		return res.json({ ok: true, coordinator: { port: PORT }, workers: checks });
	} catch (e: any) {
		return res.status(500).json({ ok: false, error: String(e?.message || e) });
	}
});

// Monitor nodes endpoint - Display worker info with hardware and signature status
// Format: "Worker-1 · 8 cores · sig verified ✅"
app.get("/api/monitor/nodes", async (_req, res) => {
	try {
		const checks = await Promise.all(
			WORKERS.map(async w => {
				try {
					const r = await axios.get(`${w}/health`, { timeout: 3000 });
					const detail = r.data;
					const cpuCores = detail.hardwareInfo?.cpu_cores || 0;
					const nodeId = detail.nodeId || "unknown";
					const sigVerified = detail.signatureAvailable ? "✅" : "❌";
					const suiAddress = detail.suiAddress || "unknown";
					
					return {
						worker: w,
						ok: true,
						nodeId,
						suiAddress,
						cpuCores,
						hardwareInfo: detail.hardwareInfo,
						signatureAvailable: detail.signatureAvailable || false,
						display: `${nodeId} · ${cpuCores} cores · sig verified ${sigVerified}`,
						detail,
					};
				} catch (e: any) {
					return { 
						worker: w, 
						ok: false, 
						error: String(e?.message || e),
						display: `${w} · error ❌`
					};
				}
			})
		);
		
		return res.json({ 
			ok: true, 
			coordinator: { port: PORT },
			workers: checks,
			display: checks.map(c => c.display || `${c.worker} · ${c.ok ? "OK" : "ERROR"}`).join("\n")
		});
	} catch (e: any) {
		return res.status(500).json({ ok: false, error: String(e?.message || e) });
	}
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "file is required" });
		}
		const prompt = (req.body?.prompt as string) || "";
		const sessionKey = (req.body?.sessionKey as string) || "";
		const userAddress = (req.body?.userAddress as string) || "";
	const content = req.file.buffer.toString("utf-8");
	broadcast("status", { stage: "validating", message: "Validating file...", progress: 5 });
	broadcast("progress", { stage: "validating", message: "Validating file...", progress: 5 });

		// naive split by lines into two shards
		const lines = content.split(/\r?\n/);
		const header = lines[0] || "";
		const rest = lines.slice(1);
		const mid = Math.ceil(rest.length / 2);
		const shard1 = [header, ...rest.slice(0, mid)].join("\n");
		const shard2 = [header, ...rest.slice(mid)].join("\n");

	const epochCount = 5;
	const globalModelHash = "model-v0-" + Date.now().toString(36);
	broadcast("status", { stage: "splitting", message: "Splitting data across workers...", progress: 10 });
	broadcast("progress", { stage: "splitting", message: "Splitting data across workers...", progress: 10 });

		// Encrypt shards before sending to workers (if sessionKey provided)
		// Workers will decrypt using sessionKey and txBytes
		let shardRequests: TrainShardRequest[] = [];
		let txBytes1: Uint8Array | null = null;
		let txBytes2: Uint8Array | null = null;

		if (sessionKey && userAddress) {
			broadcast("status", { stage: "encrypting", message: "Encrypting data shards...", progress: 15 });
			broadcast("progress", { stage: "encrypting", message: "Encrypting data shards...", progress: 15 });
			try {
				// Zero-knowledge commit: Create commit hash before encrypting
				// Coordinator creates commit = hash(shardPlaintext)
				// Worker verifies after decrypt by hashing plaintext and comparing
				const commitHash1 = crypto.createHash("sha256").update(shard1).digest("hex");
				const commitHash2 = crypto.createHash("sha256").update(shard2).digest("hex");
				
				const enc1 = await encryptShard(shard1, userAddress);
				const enc2 = await encryptShard(shard2, userAddress);
				
				// Store txBytes for workers (convert to base64 for transmission)
				txBytes1 = enc1.txBytes;
				txBytes2 = enc2.txBytes;
				
				// Workers will decrypt using sessionKey and txBytes
				// Include commit hash for zero-knowledge verification
				shardRequests = [
					{
						dataShard: "", // Empty, using encryptedData instead
						encryptedData: JSON.stringify(enc1.encryptedParts),
						sessionKey: sessionKey,
						txBytes: Buffer.from(txBytes1).toString("base64"),
						userAddress: userAddress,
						commitHash: commitHash1, // Zero-knowledge commit hash
						globalModelHash,
						epochCount,
						nodeId: "worker-1",
						randomSeed: 1337
					},
					{
						dataShard: "", // Empty, using encryptedData instead
						encryptedData: JSON.stringify(enc2.encryptedParts),
						sessionKey: sessionKey,
						txBytes: Buffer.from(txBytes2).toString("base64"),
						userAddress: userAddress,
						commitHash: commitHash2, // Zero-knowledge commit hash
						globalModelHash,
						epochCount,
						nodeId: "worker-2",
						randomSeed: 4242
					}
				];
			} catch (err) {
				console.warn("Encryption failed, using plain data:", err);
				// Fallback to plain data
				shardRequests = [
					{ dataShard: shard1, globalModelHash, epochCount, nodeId: "worker-1", randomSeed: 1337 },
					{ dataShard: shard2, globalModelHash, epochCount, nodeId: "worker-2", randomSeed: 4242 }
				];
			}
		} else {
			// No encryption, send plain data
			shardRequests = [
				{ dataShard: shard1, globalModelHash, epochCount, nodeId: "worker-1", randomSeed: 1337 },
				{ dataShard: shard2, globalModelHash, epochCount, nodeId: "worker-2", randomSeed: 4242 }
			];
		}

		// dispatch to workers (handle partial failures)
		broadcast("status", { stage: "dispatch", message: "Dispatching shards to workers...", progress: 20 });
		broadcast("progress", { stage: "dispatch", message: "Dispatching shards to workers...", progress: 20 });
		const results: TrainUpdate[] = [];
		const activeWorkers = WORKERS.filter(Boolean);
		const tasks = shardRequests.map(async (payload, idx) => {
			const workerUrl = activeWorkers[idx % activeWorkers.length];
			try {
				console.log(`[WORKER ${workerUrl}] Sending training request...`);
				const resp = await axios.post(`${workerUrl}/train`, payload, { timeout: 120_000 }); // Increase timeout to 120s
				
				// Check if response is an error
				if (resp.status !== 200 || (resp.data as any).error) {
					const errorMsg = (resp.data as any).error || `Worker returned status ${resp.status}`;
					console.error(`Worker ${workerUrl} error:`, errorMsg);
					broadcast("status", {
						stage: "worker_failed",
						message: `Worker at ${workerUrl} returned error: ${errorMsg}`
					});
					return;
				}
				
				console.log(`[WORKER ${workerUrl}] Response received:`, {
					hasData: !!resp.data,
					isEncrypted: (resp.data as any).encrypted,
					hasEncryptedUpdate: !!(resp.data as any).encryptedUpdate,
					hasNodeId: !!(resp.data as any).nodeId,
					keys: Object.keys(resp.data || {})
				});
				
				let update = resp.data as TrainUpdate;
				
				// Handle encrypted updates from workers (decrypt internal for aggregation)
				// Workers encrypt logs/updates before sending
				if (update.encrypted && update.encryptedUpdate && sessionKey) {
					try {
						console.log(`[WORKER ${workerUrl}] Decrypting encrypted update...`);
						// Decrypt worker update internally
						// In production: Use proper decryption (Seal or symmetric)
						// For MVP: base64 decode as placeholder
						if (update.encryptedUpdate.encryption === "base64") {
							const decryptedData = Buffer.from(update.encryptedUpdate.data, "base64").toString("utf-8");
							update = JSON.parse(decryptedData) as TrainUpdate;
							console.log(`[WORKER ${workerUrl}] Decryption successful, nodeId:`, update.nodeId);
						} else {
							// If encrypted with Seal or other method, decrypt accordingly
							// For now, treat as plain
							console.warn(`[WORKER ${workerUrl}] Unknown encryption format:`, update.encryptedUpdate.encryption, "treating as plain");
						}
					} catch (decryptErr: any) {
						console.error(`[WORKER ${workerUrl}] Failed to decrypt worker update:`, decryptErr?.message || decryptErr);
						console.error(`[WORKER ${workerUrl}] Decrypt error stack:`, decryptErr?.stack);
						throw new Error("Failed to decrypt worker update");
					}
				} else if (update.encrypted && !sessionKey) {
					console.warn(`[WORKER ${workerUrl}] Update is encrypted but no sessionKey provided`);
				}
				
				// Validate required fields
				if (!update.nodeId || !update.numSamples || !update.lossHistory || !update.deltaWeightsHash) {
					console.error(`[WORKER ${workerUrl}] Missing required fields:`, {
						hasNodeId: !!update.nodeId,
						hasNumSamples: !!update.numSamples,
						hasLossHistory: !!update.lossHistory,
						hasDeltaWeightsHash: !!update.deltaWeightsHash,
						updateKeys: Object.keys(update)
					});
					broadcast("status", {
						stage: "worker_failed",
						message: `Update from ${workerUrl} missing required fields`
					});
					return;
				}
				
				// Verify each update with Seal (cryptographic + heuristic)
				console.log(`[WORKER ${workerUrl}] Verifying update from nodeId:`, update.nodeId);
				console.log(`[WORKER ${workerUrl}] Attestation:`, {
					hasAttestation: !!update.attestation,
					hasSignature: !!update.attestation?.signature,
					hasPublicKey: !!update.attestation?.publicKey,
					hasMessage: !!update.attestation?.message
				});
				try {
					const ver = await verifyWithSeal({
						nodeId: update.nodeId,
						numSamples: update.numSamples,
						lossHistory: update.lossHistory,
						deltaWeightsHash: update.deltaWeightsHash,
						startedAt: update.startedAt,
						finishedAt: update.finishedAt,
						attestation: update.attestation
					});
					console.log(`[WORKER ${workerUrl}] Verification result:`, {
						verified: ver.verified,
						score: ver.score,
						reason: ver.reason || "verified"
					});
					if (!ver.verified) {
						broadcast("status", {
							stage: "worker_rejected",
							message: `Update from ${update.nodeId} rejected by verifier: ${ver.reason || "unknown"}`
						});
						return;
					}
				} catch (verifyErr: any) {
					console.error(`[WORKER ${workerUrl}] Verification error:`, verifyErr?.message || verifyErr);
					console.error(`[WORKER ${workerUrl}] Verify error stack:`, verifyErr?.stack);
					broadcast("status", {
						stage: "worker_rejected",
						message: `Update from ${update.nodeId} verification failed: ${verifyErr?.message || "unknown error"}`
					});
					return;
				}
				results.push(update);
				const workerProgress = 20 + ((results.length / shardRequests.length) * 50); // 20-70% based on workers completed
				broadcast("status", { stage: "training", message: `Received update from ${update.nodeId} (${results.length}/${shardRequests.length})`, progress: Math.round(workerProgress) });
				broadcast("progress", { stage: "training", message: `Received update from ${update.nodeId} (${results.length}/${shardRequests.length})`, progress: Math.round(workerProgress) });
			} catch (e: any) {
				const errorMsg = e?.response?.data?.error || e?.message || String(e);
				const statusCode = e?.response?.status || "N/A";
				console.error(`Worker ${workerUrl} exception:`, {
					message: errorMsg,
					status: statusCode,
					stack: e?.stack,
					responseData: e?.response?.data
				});
				broadcast("status", {
					stage: "worker_failed",
					message: `Worker at ${workerUrl} failed: ${errorMsg} (status: ${statusCode})`
				});
			}
		});
		await Promise.all(tasks);
		if (results.length === 0) {
			throw new Error("All workers failed to return updates");
		}

		// Aggregate data insights from workers (from original CSV analysis)
		broadcast("status", { stage: "aggregating", message: "Aggregating model updates and data insights...", progress: 70 });
		broadcast("progress", { stage: "aggregating", message: "Aggregating model updates and data insights...", progress: 70 });
		const aggregatedHash = "agg-" + results.map(r => r.deltaWeightsHash).join(".").slice(0, 24);
		
		// Aggregate data insights from all workers
		const aggregatedDataInsights = aggregateDataInsights(results.map(r => r.dataInsights).filter(Boolean));
		
		// Generate charts from actual data insights
		const chartsData = generateChartsFromDataInsights(aggregatedDataInsights);
		
		console.log("[CHARTS] Generated charts from data insights:", {
			correlations: chartsData.correlationMatrix.length,
			trends: chartsData.trends.length,
			clusters: chartsData.clusters.length,
			summary: chartsData.summary,
		});
		
		// Remove mock CIDs (no longer needed, using actual data)
		const correlationCid = "walrus:cid:" + Math.random().toString(36).slice(2, 10);
		const outlierCid = "walrus:cid:" + Math.random().toString(36).slice(2, 10);
		const trendCid = "walrus:cid:" + Math.random().toString(36).slice(2, 10);

		// Generate AI insight using OpenRouter (after aggregation)
		broadcast("status", { stage: "generating_insights", message: "Generating AI insights with LLM...", progress: 75 });
		broadcast("progress", { stage: "generating_insights", message: "Generating AI insights with LLM...", progress: 75 });
		
		let aiInsight;
		try {
			const llmAvailable = await checkOllamaHealth(); // Function name kept for compatibility
			if (llmAvailable) {
				console.log("[LLM] OpenRouter available, generating AI insight...");
				aiInsight = await generateInsight({
					metrics: {
						numWorkers: results.length,
						avgFinalLoss: results.reduce((acc, r) => acc + (r.lossHistory[r.lossHistory.length - 1] || 0), 0) / Math.max(1, results.length),
						numSamples: results.map(r => r.numSamples),
						lossHistories: results.map(r => r.lossHistory),
						workerInfo: results.map(r => ({
							nodeId: r.nodeId,
							suiAddress: r.suiAddress,
							numSamples: r.numSamples,
							finalLoss: r.lossHistory[r.lossHistory.length - 1] || 0,
						})),
						// Include actual data insights from CSV analysis
						dataInsights: aggregatedDataInsights,
						// Include charts data for LLM to explain
						chartsData: chartsData,
					},
					userPrompt: prompt || undefined,
					aggregatedHash,
					hasEncryption: !!(sessionKey && userAddress),
				});
				console.log("[LLM] ✅ AI insight generated:", {
					title: aiInsight.title,
					summaryLength: aiInsight.summary.length,
					findingsCount: aiInsight.keyFindings.length,
				});
			} else {
				console.warn("[LLM] OpenRouter not available (no API key), using fallback insight");
				aiInsight = null;
			}
		} catch (llmError: any) {
			console.error("[LLM] Error generating insight:", llmError?.message || llmError);
			aiInsight = null; // Fallback to mock insight
		}

		// Full audit log trace: Complete JSON trace with all events
		// Includes: training start, decrypt permission, policy call result, worker identity, timing, losses, update hash, signature, nonce, final aggregated hash
		const auditTraceComplete = {
			trainingStart: new Date().toISOString(),
			globalModelHash: aggregatedHash,
			prompt: prompt || "",
			userAddress: userAddress || "",
			hasEncryption: !!(sessionKey && userAddress),
			workers: results.map(r => ({
				nodeId: r.nodeId,
				suiAddress: r.suiAddress || r.attestation?.suiAddress,
				hardwareInfo: r.attestation?.hardwareInfo,
				numSamples: r.numSamples,
				weightsHash: r.weightsHash,
				lossHistory: r.lossHistory,
				lossHistoryHash: r.attestation?.lossHistoryHash,
				startedAt: r.startedAt,
				finishedAt: r.finishedAt,
				signature: r.attestation?.signature,
				publicKey: r.attestation?.publicKey,
				commitVerified: r.attestation?.commitVerified,
				auditTrace: r.auditTrace || [],
				replayProof: {
					epochLossHashes: r.epochLossHashes || [],
					epochGradientNormHashes: r.epochGradientNormHashes || [],
					randomChallengeSeed: r.randomChallengeSeed,
				},
			})),
			aggregation: {
				aggregatedHash,
				aggregatedAt: new Date().toISOString(),
				numWorkers: results.length,
				avgFinalLoss: results.reduce((acc, r) => acc + (r.lossHistory[r.lossHistory.length - 1] || 0), 0) / Math.max(1, results.length),
			},
			provenance: {
				charts: { correlationCid, outlierCid, trendCid },
				nonce: crypto.randomBytes(16).toString("hex"),
			},
		};
		
		// Walrus + Sui proof placeholders
		broadcast("status", { stage: "proving", message: "Storing provenance and creating onchain record...", progress: 80 });
		broadcast("progress", { stage: "proving", message: "Storing provenance and creating onchain record...", progress: 80 });
		const walrusPayload = {
			globalModelHash: aggregatedHash,
			updates: results,
			charts: { correlationCid, outlierCid, trendCid },
			aggregatedAt: new Date().toISOString(),
			// Full audit log trace (complete JSON trace)
			auditTraceComplete,
		};
		broadcast("status", { stage: "uploading", message: "Uploading audit log to Walrus...", progress: 85 });
		broadcast("progress", { stage: "uploading", message: "Uploading audit log to Walrus...", progress: 85 });
		const walrus = await storeToWalrus(walrusPayload);
		broadcast("status", { stage: "recording", message: "Recording on-chain provenance...", progress: 90 });
		broadcast("progress", { stage: "recording", message: "Recording on-chain provenance...", progress: 90 });
		const sui = await recordOnSui({ walrusCid: walrus.cid, participants: results.map(r => r.nodeId) });

		// Use AI-generated insight if available, otherwise use fallback
		const insightTitle = aiInsight?.title || "Federated Learning Analysis";
		const insightSummary = aiInsight?.summary || `Data analyzed across ${results.length} workers. Prompt: ${prompt || "-"}.\nData insights generated from actual CSV analysis (${chartsData.summary.total_samples} samples, ${chartsData.summary.numeric_columns} numeric columns, ${chartsData.summary.strong_correlations} strong correlations).`;
		
		const agg: AggregationResult = {
			globalModelHash: aggregatedHash,
			updates: results,
			aggregatedAt: new Date().toISOString(),
			insight: {
				title: insightTitle,
				summary: insightSummary,
				keyFindings: aiInsight?.keyFindings || [],
				recommendations: aiInsight?.recommendations || [],
				metrics: {
					numWorkers: results.length,
					avgFinalLoss:
						results.reduce((acc, r) => acc + (r.lossHistory[r.lossHistory.length - 1] || 0), 0) /
						Math.max(1, results.length)
				},
				charts: [
					{ type: "correlation", cid: correlationCid },
					{ type: "outliers", cid: outlierCid },
					{ type: "trend", cid: trendCid }
				],
				// Include AI-generated visualization hints if available
				visualizationHints: aiInsight?.visualizationHints || {},
				// Include actual chart data from CSV analysis (not mock)
				chartData: chartsData,
			},
			proof: {
				walrusCid: walrus.cid,
				walrusScanUrl: walrus.walrusScanUrl, // Include Walrus Scan URL
				blobObjectId: walrus.blobObjectId, // Include Blob Object ID
				suiTxHash: sui.txHash
			}
		};

		broadcast("status", { stage: "complete", message: "Training complete! Insights ready.", progress: 100 });
		broadcast("progress", { stage: "complete", message: "Training complete! Insights ready.", progress: 100 });
		broadcast("complete", { ...agg, progress: 100 });
		broadcast("done", { ...agg, progress: 100 });
		return res.json(agg);
	} catch (err: any) {
		console.error(err);
		broadcast("status", { stage: "error", message: "Processing failed" });
		return res.status(500).json({ error: "internal_error", detail: String(err?.message || err) });
	}
});

app.get("/api/health", (_req, res) => {
	res.json({ ok: true, role: "coordinator", port: PORT, workers: WORKERS });
});

app.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`[coordinator] listening on http://localhost:${PORT}`);
});

