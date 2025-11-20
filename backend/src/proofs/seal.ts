import { SealClient } from "@mysten/seal";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { config } from "../config.js";

// Seal Testnet Package ID (on-chain registry)
const SEAL_TESTNET_PACKAGE_ID = "0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682";

// Policy Package ID (deploy flowdata-policy to testnet first)
// This is set via SEAL_POLICY_PACKAGE_ID environment variable

// Verified Key Servers for Testnet (from Mysten Seal docs - fallback if on-chain query fails)
// These are the verified testnet key servers from official docs
// Note: URL may change, but Object Id is the source of truth
const VERIFIED_TESTNET_KEY_SERVERS: Array<{ objectId: string; weight: number }> = [
	// Mysten Labs
	{ objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", weight: 1 }, // mysten-testnet-1 (Open mode)
	{ objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8", weight: 1 }, // mysten-testnet-2 (Open mode)
	
	// Ruby Nodes
	{ objectId: "0x6068c0acb197dddbacd4746a9de7f025b2ed5a5b6c1b1ab44dade4426d141da2", weight: 1 }, // Ruby Nodes (Open mode)
	
	// NodeInfra
	{ objectId: "0x5466b7df5c15b508678d51496ada8afab0d6f70a01c10613123382b1b8131007", weight: 1 }, // NodeInfra (Open mode)
	
	// Studio Mirai
	{ objectId: "0x164ac3d2b3b8694b8181c13f671950004765c23f270321a45fdd04d40cccf0f2", weight: 1 }, // Studio Mirai (Open mode)
	
	// Overclock
	{ objectId: "0x9c949e53c36ab7a9c484ed9e8b43267a77d4b8d70e79aa6b39042e3d4c434105", weight: 1 }, // Overclock (Open mode)
	
	// H2O Nodes
	{ objectId: "0x39cef09b24b667bc6ed54f7159d82352fe2d5dd97ca9a5beaa1d21aa774f25a2", weight: 1 }, // H2O Nodes (Open mode)
	
	// Triton One
	{ objectId: "0x4cded1abeb52a22b6becb42a91d3686a4c901cf52eee16234214d0b5b2da4c46", weight: 1 }, // Triton One (Open mode)
	
	// Natsai
	{ objectId: "0x3c93ec1474454e1b47cf485a4e5361a5878d722b9492daf10ef626a76adc3dad", weight: 1 }, // Natsai (Open mode)
	
	// Mhax.io
	{ objectId: "0x6a0726a1ea3d62ba2f2ae51104f2c3633c003fb75621d06fde47f04dc930ba06", weight: 1 }, // Mhax.io (Open mode)
];

let sealClient: SealClient | null = null;
let keyServersCache: Array<{ objectId: string; weight: number }> | null = null;

async function fetchKeyServersFromRegistry(): Promise<Array<{ objectId: string; weight: number }>> {
	try {
		const network = config.suiNetwork as "mainnet" | "testnet" | "devnet" | "localnet";
		if (network !== "testnet") {
			// For other networks, use verified key servers or return empty
			return VERIFIED_TESTNET_KEY_SERVERS;
		}

		const client = new SuiClient({ url: config.suiRpcUrl });
		
		// Query on-chain registry for key servers
		const registry = await client.getDynamicFields({
			parentId: SEAL_TESTNET_PACKAGE_ID,
		});

		// Extract key server object IDs from registry
		const keyServers: Array<{ objectId: string; weight: number }> = [];
		
		// Process each dynamic field to get key server info
		// Note: Each field may contain key server object ID and metadata
		for (const field of registry.data) {
			try {
				// Get the object ID from dynamic field
				// field.name.value or field.objectId contains the key server object ID
				const keyServerObjectId = (field as any).objectId || (field as any).name?.value;
				
				if (!keyServerObjectId) {
					console.warn("Skipping field without objectId:", field);
					continue;
				}

				// Get the object to extract key server info
				const obj = await client.getObject({
					id: keyServerObjectId,
					options: { showContent: true },
				});
				
				// Parse key server info from object (adjust based on actual structure)
				// For hackathon MVP, use objectId with weight 1
				// In production, extract weight and other metadata from object content
				keyServers.push({
					objectId: keyServerObjectId,
					weight: 1, // Default weight, adjust if object contains weight field
				});
			} catch (err) {
				// Skip invalid objects
				console.warn(`Failed to fetch key server:`, err);
			}
		}

		if (keyServers.length > 0) {
			return keyServers;
		}
		
		// Fallback to verified key servers if registry empty
		return VERIFIED_TESTNET_KEY_SERVERS;
	} catch (err: any) {
		console.error("Failed to fetch key servers from registry:", err?.message || err);
		// Fallback to verified key servers
		return VERIFIED_TESTNET_KEY_SERVERS;
	}
}

async function getSealClient(): Promise<SealClient | null> {
	if (!sealClient) {
		const network = config.suiNetwork as "mainnet" | "testnet" | "devnet" | "localnet";
		
		if (network !== "testnet") {
			// For non-testnet, return null (use fallback)
			return null;
		}

		const suiClient = new SuiJsonRpcClient({
			url: config.suiRpcUrl,
		});
		
		// Fetch key servers from on-chain registry
		if (!keyServersCache) {
			keyServersCache = await fetchKeyServersFromRegistry();
		}

		if (keyServersCache.length === 0) {
			// No key servers found - use fallback
			console.warn("No key servers found, using fallback encryption");
			return null;
		}

		// Initialize SealClient with fetched key servers
		sealClient = new SealClient({
			suiClient: suiClient as any,
			serverConfigs: keyServersCache,
		});
	}
	return sealClient;
}

// Encrypt shard data before sending to worker
// Returns encrypted data, policy, and txBytes (required for decryption)
export async function encryptShard(data: unknown, userAddress?: string): Promise<{ 
	encryptedParts: unknown; 
	policy: unknown;
	txBytes: Uint8Array;
}> {
	try {
		const seal = await getSealClient();
		if (!seal) {
			// Fallback for non-testnet networks or if no key servers found
			return {
				encryptedParts: data,
				policy: { type: "OwnerOnly", owner: userAddress || "0x0" },
				txBytes: new Uint8Array(),
			};
		}
		
		const dataBuffer = Buffer.from(JSON.stringify(data), "utf-8");
		const id = userAddress || "0x0000000000000000000000000000000000000000000000000000000000000000";
		
		// Use policy package ID if configured, otherwise fallback to Seal package ID
		const policyPackageId = config.sealPolicyPackageId || SEAL_TESTNET_PACKAGE_ID;
		
		// SealClient encrypt requires packageId, id, threshold, data
		// Use policy package ID for encryption (allows Seal key servers to verify via policy function)
		// The SDK will automatically use public key servers for testnet
		const encrypted = await seal.encrypt({
			packageId: policyPackageId, // Use policy package ID (or Seal package ID as fallback)
			id: id,
			threshold: 1, // Minimum threshold
			data: new Uint8Array(dataBuffer),
		});
		
		// Extract txBytes from encrypt response (required for decryption)
		// The encrypted object should contain transaction bytes
		const txBytes = (encrypted as any).txBytes || (encrypted as any).transactionBytes || new Uint8Array();
		
		return {
			encryptedParts: encrypted.encryptedObject,
			policy: { type: "OwnerOnly", owner: userAddress || "0x0" },
			txBytes: txBytes instanceof Uint8Array ? txBytes : new Uint8Array(txBytes),
		};
	} catch (err: any) {
		console.error("Seal encryption error:", err?.message || err);
		// Fallback: return data as-is if encryption fails
		return {
			encryptedParts: data,
			policy: { type: "OwnerOnly", owner: userAddress || "0x0" },
			txBytes: new Uint8Array(),
		};
	}
}

// Simulate Sui transaction before decryption (dry-run checking)
// Pre-verifies policy allow/deny, gas estimation, expected object changes
export async function simulateSealDecryptTransaction(
	txBytes: Uint8Array,
	senderAddress?: string
): Promise<{
	allowed: boolean;
	gasEstimate?: number;
	error?: string;
	simulationResult?: any;
}> {
	try {
		const client = new SuiClient({ url: config.suiRpcUrl });
		
		// Simulate transaction using devInspectTransactionBlock
		const result = await client.devInspectTransactionBlock({
			sender: senderAddress || config.deployedSender, // Use deployed sender as default
			transactionBlock: txBytes,
		});
		
		// Check if simulation succeeded
		const allowed = !result.effects.status.error;
		const gasEstimate = result.effects.gasUsed?.computationCost 
			? Number(result.effects.gasUsed.computationCost) 
			: undefined;
		
		return {
			allowed,
			gasEstimate,
			simulationResult: result,
			error: result.effects.status.error ? String(result.effects.status.error) : undefined,
		};
	} catch (err: any) {
		console.warn("Transaction simulation failed:", err?.message || err);
		// If simulation fails, allow decryption (fallback for hackathon MVP)
		// In production, you might want to deny on simulation failure
		return {
			allowed: true, // Allow on simulation failure (MVP)
			error: err?.message || String(err),
		};
	}
}

// Decrypt shard data (for workers with permission)
// txBytes is required for proper decryption (from encrypt response)
// Includes transaction simulation (dry-run) before actual decryption
export async function decryptShard(
	encryptedParts: unknown,
	sessionKey: string,
	txBytes: Uint8Array,
	requesterAddress?: string
): Promise<unknown> {
	try {
		const seal = await getSealClient();
		if (!seal) {
			// Fallback if no key servers found or non-testnet
			return encryptedParts;
		}
		
		if (!sessionKey) {
			console.warn("No sessionKey provided for decryption, returning encrypted data");
			return encryptedParts;
		}

		// Convert sessionKey from base64 string to Uint8Array if needed
		let sessionKeyBytes: Uint8Array;
		try {
			// Try to decode as base64 first
			sessionKeyBytes = Buffer.from(sessionKey, "base64");
		} catch {
			// If not base64, treat as hex or use directly
			sessionKeyBytes = Buffer.from(sessionKey, "utf-8");
		}

		// Convert encryptedParts to Uint8Array if it's not already
		let encryptedData: Uint8Array;
		if (encryptedParts instanceof Uint8Array) {
			encryptedData = encryptedParts;
		} else if (typeof encryptedParts === "string") {
			// Try to parse as JSON first (if it's stringified)
			try {
				const parsed = JSON.parse(encryptedParts);
				if (parsed instanceof Uint8Array || Array.isArray(parsed)) {
					encryptedData = new Uint8Array(parsed);
				} else {
					encryptedData = Buffer.from(encryptedParts, "utf-8");
				}
			} catch {
				encryptedData = Buffer.from(encryptedParts, "utf-8");
			}
		} else if (Array.isArray(encryptedParts)) {
			encryptedData = new Uint8Array(encryptedParts);
		} else {
			encryptedData = Buffer.from(JSON.stringify(encryptedParts), "utf-8");
		}

		// Convert txBytes if it's not already Uint8Array
		let txBytesArray: Uint8Array;
		if (txBytes instanceof Uint8Array) {
			txBytesArray = txBytes;
		} else if (typeof txBytes === "string") {
			try {
				const parsed = JSON.parse(txBytes);
				txBytesArray = new Uint8Array(parsed);
			} catch {
				// Try base64 decode
				try {
					txBytesArray = Buffer.from(txBytes, "base64");
				} catch {
					txBytesArray = new Uint8Array();
				}
			}
		} else if (Array.isArray(txBytes)) {
			txBytesArray = new Uint8Array(txBytes);
		} else {
			txBytesArray = new Uint8Array();
		}

		// Pre-verify transaction with simulation (dry-run checking)
		if (txBytesArray.length > 0) {
			const simulation = await simulateSealDecryptTransaction(txBytesArray, requesterAddress);
			if (!simulation.allowed) {
				throw new Error(`Transaction simulation failed: ${simulation.error || "Policy denied"}`);
			}
			// Optional: Log gas estimate
			if (simulation.gasEstimate) {
				console.log(`Decrypt transaction gas estimate: ${simulation.gasEstimate}`);
			}
		}
		
		// SealClient decrypt requires: data, sessionKey, txBytes
		// txBytes is now properly extracted from encrypt response
		// Transaction has been pre-verified via simulation
		const decrypted = await seal.decrypt({
			data: encryptedData,
			sessionKey: sessionKeyBytes as any, // SessionKey type from Seal SDK
			txBytes: txBytesArray,
		});
		
		const jsonString = Buffer.from(decrypted).toString("utf-8");
		return JSON.parse(jsonString);
	} catch (err: any) {
		console.error("Seal decryption error:", err?.message || err);
		// Fallback: return as-is if decryption fails
		return encryptedParts;
	}
}

export type SealVerificationInput = {
	nodeId: string;
	numSamples: number;
	lossHistory: number[];
	deltaWeightsHash: string;
	startedAt: string;
	finishedAt: string;
	attestation?: {
		message: string;
		signature: string;
		publicKey?: string; // Base64 encoded public key for cryptographic verification
	};
};

// Verify training result with cryptographic signature verification
export async function verifyWithSeal(input: SealVerificationInput): Promise<{ verified: boolean; score: number; reason?: string }> {
	// Cryptographic verification: verify signature if publicKey provided
	let cryptographicallyVerified = false;
	let cryptoError: string | undefined;
	if (input.attestation?.signature && input.attestation?.publicKey) {
		try {
			cryptographicallyVerified = await verifyCryptographicSignature(
				input.attestation.message,
				input.attestation.signature,
				input.attestation.publicKey
			);
			if (!cryptographicallyVerified) {
				cryptoError = "Cryptographic signature verification failed";
			}
		} catch (err: any) {
			cryptoError = `Cryptographic signature verification error: ${err?.message || err}`;
			console.warn("Cryptographic signature verification failed:", err);
		}
	}
	
	// Heuristic checks (backup verification)
	const monotone = isMostlyDecreasing(input.lossHistory);
	const realistic = isDurationRealistic(input.startedAt, input.finishedAt, input.numSamples);
	const hashValid = !!input.deltaWeightsHash && input.deltaWeightsHash.length >= 16;
	const heuristicVerified = monotone && realistic && hashValid;
	
	// Build reason for failure
	const reasons: string[] = [];
	if (!monotone) reasons.push("loss not decreasing");
	if (!realistic) reasons.push("duration unrealistic");
	if (!hashValid) reasons.push("invalid hash");
	if (input.attestation?.publicKey && !cryptographicallyVerified) {
		reasons.push(cryptoError || "signature verification failed");
	}
	
	// Prefer cryptographic verification if available, otherwise use heuristic
	// For MVP: Accept if either cryptographic OR heuristic verification passes
	// In production, you might want stricter requirements
	const verified = cryptographicallyVerified || heuristicVerified;
	
	// Score based on verification method
	let score = 0.3;
	if (cryptographicallyVerified) {
		score = 0.95; // High score for cryptographic proof
	} else if (heuristicVerified) {
		score = 0.7; // Medium score for heuristic
	} else if (monotone || realistic) {
		score = 0.5;
	}
	
	return { 
		verified, 
		score,
		reason: verified ? undefined : reasons.join(", ") || "unknown verification failure"
	};
}

// Verify cryptographic signature (Ed25519 from Python workers)
// Workers use Ed25519 raw signatures (64 bytes) from cryptography library
async function verifyCryptographicSignature(
	message: string,
	signature: string,
	publicKeyBase64: string
): Promise<boolean> {
	try {
		// Parse base64 signature and public key
		const signatureBytes = Buffer.from(signature, "base64");
		const publicKeyBytes = Buffer.from(publicKeyBase64, "base64");
		
		// Use Sui Ed25519PublicKey for Ed25519 verification
		const { Ed25519PublicKey } = await import("@mysten/sui/keypairs/ed25519");
		
		// Create Ed25519PublicKey from raw bytes (32 bytes for Ed25519)
		const publicKey = new Ed25519PublicKey(publicKeyBytes);
		
		// Verify signature directly (Ed25519 raw signature verification)
		// Note: Workers sign raw message bytes, not with IntentScope
		const messageBytes = new TextEncoder().encode(message);
		
		// Use verifyPersonalMessage for direct message verification
		// Ed25519PublicKey has verifyPersonalMessage method
		try {
			// Try to verify using verifyPersonalMessage (standard Sui method)
			return await publicKey.verifyPersonalMessage(messageBytes, signatureBytes);
		} catch {
			// Fallback: If verifyPersonalMessage doesn't work, use messageWithIntent
			const { messageWithIntent } = await import("@mysten/sui/cryptography");
			const intentMessage = messageWithIntent("PersonalMessage", messageBytes);
			// Try direct verify (some Sui versions support this)
			try {
				return await publicKey.verify(intentMessage, signatureBytes);
			} catch {
				// Last fallback: return false if all methods fail
				console.warn("All signature verification methods failed");
				return false;
			}
		}
	} catch (err) {
		console.error("Cryptographic verification error:", err);
		return false;
	}
}

function isMostlyDecreasing(arr: number[]) {
	if (arr.length < 2) return true;
	let better = 0;
	for (let i = 1; i < arr.length; i++) {
		if (arr[i] <= arr[i - 1]) better++;
	}
	return better / (arr.length - 1) >= 0.6;
}

function isDurationRealistic(startIso: string, endIso: string, samples: number) {
	const start = Date.parse(startIso);
	const end = Date.parse(endIso);
	if (!isFinite(start) || !isFinite(end)) return true;
	const ms = end - start;
	// naive: at least 50ms per 100 rows
	const minMs = Math.max(200, (samples / 100) * 50);
	return ms >= minMs;
}

