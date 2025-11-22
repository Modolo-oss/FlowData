import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { getFullnodeUrl } from "@mysten/sui/client";
import { walrus } from "@mysten/walrus";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { bech32 } from "bech32";
import { Agent, fetch } from "undici";
import type { RequestInfo, RequestInit } from "undici";
import { config } from "../config.js";

// Initialize Walrus client (official SDK pattern)
let walrusClient: any = null;

function getWalrusClient() {
	if (!walrusClient) {
		const network = (config.suiNetwork === "mainnet" || config.suiNetwork === "testnet")
			? config.suiNetwork
			: "testnet";
		
		// Use official SDK pattern: SuiJsonRpcClient.$extend(walrus())
		walrusClient = new SuiJsonRpcClient({
			url: config.suiRpcUrl || getFullnodeUrl(network),
			// Setting network on your client is required for walrus to work correctly
			network: network,
		}).$extend(
			walrus({
				storageNodeClientOptions: {
					timeout: 120_000, // 120 seconds
					fetch: fetch as any, // Use undici fetch directly
				},
			})
		);
		
		console.log(`[WALRUS] ✅ Initialized Walrus SDK client for ${network}`);
	}
	return walrusClient;
}

function getSigner(): Ed25519Keypair {
	const keyEnv = process.env.WALRUS_SIGNER_PRIVATE_KEY;
	if (!keyEnv) {
		console.warn("[WALRUS] WALRUS_SIGNER_PRIVATE_KEY not set, using ephemeral keypair");
		return new Ed25519Keypair();
	}

	try {
		// Try Bech32 format first (suiprivkey1...)
		if (keyEnv.startsWith("suiprivkey1")) {
			const decoded = bech32.decode(keyEnv);
			const keyBytes = Buffer.from(bech32.fromWords(decoded.words));
			// Skip flag byte (first byte) and extract 32-byte secret key
			const secretKey = keyBytes.slice(1, 33);
			return Ed25519Keypair.fromSecretKey(secretKey);
		}

		// Try Hex format (with or without 0x prefix)
		if (keyEnv.startsWith("0x") || /^[0-9a-fA-F]{64}$/.test(keyEnv)) {
			const hexKey = keyEnv.startsWith("0x") ? keyEnv.slice(2) : keyEnv;
			const keyBytes = Buffer.from(hexKey, "hex");
			// If 64 bytes (keypair format), extract first 32 bytes as secret key
			if (keyBytes.length === 64) {
				return Ed25519Keypair.fromSecretKey(keyBytes.slice(0, 32));
			}
			// If 32 bytes, use directly
			if (keyBytes.length === 32) {
				return Ed25519Keypair.fromSecretKey(keyBytes);
			}
		}

		// Try Base64 format
		try {
			const keyBytes = Buffer.from(keyEnv, "base64");
			if (keyBytes.length === 64) {
				return Ed25519Keypair.fromSecretKey(keyBytes.slice(0, 32));
			}
			if (keyBytes.length === 32) {
				return Ed25519Keypair.fromSecretKey(keyBytes);
			}
		} catch {
			// Not base64, continue
		}

		throw new Error(`Invalid key format. Expected Bech32 (suiprivkey1...), Hex (32 or 64 bytes), or Base64 (32 or 64 bytes), got ${keyEnv.length} chars`);
	} catch (error: any) {
		console.error(`[WALRUS] Failed to parse WALRUS_SIGNER_PRIVATE_KEY, using ephemeral keypair:`, error?.message || error);
		return new Ed25519Keypair();
	}
}

/**
 * Store ANY binary data to Walrus (up to ~14 GB per file)
 * Supports: images, videos, PDF, Word, JSON, CSV, any binary file
 */
export async function storeToWalrus(
	blob: Buffer | Uint8Array | string,
	options?: { isJson?: boolean }
): Promise<{ cid: string; blobId?: string; blobObjectId?: string; walrusScanUrl?: string }> {
	const signer = getSigner();
	const signerAddress = signer.getPublicKey().toSuiAddress();
	
	// Convert to Uint8Array (binary format)
	let fileBytes: Uint8Array;
	if (Buffer.isBuffer(blob)) {
		fileBytes = new Uint8Array(blob);
	} else if (typeof blob === "string") {
		// If string, convert to bytes (could be JSON or plain text)
		if (options?.isJson) {
			fileBytes = new Uint8Array(Buffer.from(blob, "utf-8"));
		} else {
			// Plain string - treat as UTF-8
			fileBytes = new Uint8Array(Buffer.from(blob, "utf-8"));
		}
	} else {
		fileBytes = blob; // Already Uint8Array
	}
	
	try {
		const client = getWalrusClient();
		
		console.log(`[WALRUS] Using keypair from WALRUS_SIGNER_PRIVATE_KEY (public key: ${signerAddress})`);
		console.log(`[WALRUS] Preparing upload via official SDK:`);
		console.log(`[WALRUS]   - Blob size: ${fileBytes.length} bytes (${(fileBytes.length / 1024 / 1024).toFixed(2)} MB)`);
		console.log(`[WALRUS]   - Signer address: ${signerAddress}`);
		
		// Upload using official SDK pattern: client.walrus.writeBlob()
		// writeBlob() returns: { blobId, blobObject? }
		// Walrus supports ANY binary data (images, videos, PDF, Word, JSON, CSV, etc.)
		const result = await client.walrus.writeBlob({
			blob: fileBytes,
			deletable: false,
			epochs: 30,
			signer,
		});
		
		const blobId = result.blobId;
		// Extract blobObjectId properly (it's nested: result.blobObject.id.id)
		const blobObjectId = result.blobObject?.id?.id || result.blobObject?.id;
		const network = (config.suiNetwork === "mainnet" || config.suiNetwork === "testnet")
			? config.suiNetwork
			: "testnet";
		
		// Generate Walrus Scan URL
		const walrusScanUrl = `https://scan.walrus.space/${network}/blob/${blobId}`;
		
		console.log(`[WALRUS] ✅ Upload successful:`);
		console.log(`[WALRUS]   - Blob ID: ${blobId}`);
		console.log(`[WALRUS]   - Blob Object ID: ${blobObjectId || "N/A"}`);
		console.log(`[WALRUS]   - Walrus Scan: ${walrusScanUrl}`);
		
		return {
			cid: blobId, // Use blobId as CID for compatibility
			blobId,
			blobObjectId,
			walrusScanUrl,
		};
	} catch (error: any) {
		console.error(`[WALRUS] ❌ Upload failed:`, error?.message || error);
		throw error;
	}
}

/**
 * Read blob from Walrus by blobId
 * Automatically decrypts if encrypted with Seal
 */
export async function readFromWalrus(
	blobId: string,
	sessionKey?: string
): Promise<{ data: any; metadata?: any; encrypted?: boolean }> {
	try {
		const client = getWalrusClient();
		
		console.log(`[WALRUS] Reading blob: ${blobId}`);
		
		// Read blob using official SDK
		const result = await client.walrus.readBlob({
			blobId: blobId,
		});
		
		// Parse JSON data
		const storedData = JSON.parse(new TextDecoder().decode(result.blob));
		
		// Check if encrypted
		if (storedData.encrypted && storedData.data && storedData.txBytes) {
			console.log(`[WALRUS] Blob is encrypted, decrypting...`);
			
			// Decrypt using Seal
			const { decryptAuditPayload } = await import("./seal-audit.js");
			const decryptedData = await decryptAuditPayload(
				storedData.data,
				storedData.txBytes,
				sessionKey
			);
			
			console.log(`[WALRUS] ✅ Blob decrypted successfully`);
			
			return {
				data: decryptedData,
				metadata: {
					blobId: result.blobId,
					size: result.blob.length,
					encrypted: true,
				},
				encrypted: true,
			};
		}
		
		// Plain data (not encrypted)
		console.log(`[WALRUS] ✅ Blob read successfully, size: ${result.blob.length} bytes`);
		
		return {
			data: storedData,
			metadata: {
				blobId: result.blobId,
				size: result.blob.length,
				encrypted: false,
			},
			encrypted: false,
		};
	} catch (error: any) {
		console.error(`[WALRUS] ❌ Failed to read blob ${blobId}:`, error?.message || error);
		throw error;
	}
}
