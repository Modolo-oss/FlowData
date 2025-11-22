/**
 * Simplified Seal SDK for Audit Payload Encryption
 * Privacy-preserving audit layer: encrypt audit JSON before Walrus upload
 */

import { SealClient } from "@mysten/seal";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { config } from "../config.js";

// Seal Testnet Package ID (on-chain registry)
const SEAL_TESTNET_PACKAGE_ID = "0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682";

// Verified Key Servers for Testnet (fallback if on-chain query fails)
const VERIFIED_TESTNET_KEY_SERVERS: Array<{ objectId: string; weight: number }> = [
	{ objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", weight: 1 }, // mysten-testnet-1
	{ objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8", weight: 1 }, // mysten-testnet-2
	{ objectId: "0x6068c0acb197dddbacd4746a9de7f025b2ed5a5b6c1b1ab44dade4426d141da2", weight: 1 }, // Ruby Nodes
	{ objectId: "0x5466b7df5c15b508678d51496ada8afab0d6f70a01c10613123382b1b8131007", weight: 1 }, // NodeInfra
	{ objectId: "0x164ac3d2b3b8694b8181c13f671950004765c23f270321a45fdd04d40cccf0f2", weight: 1 }, // Studio Mirai
	{ objectId: "0x9c949e53c36ab7a9c484ed9e8b43267a77d4b8d70e79aa6b39042e3d4c434105", weight: 1 }, // Overclock
	{ objectId: "0x39cef09b24b667bc6ed54f7159d82352fe2d5dd97ca9a5beaa1d21aa774f25a2", weight: 1 }, // H2O Nodes
	{ objectId: "0x4cded1abeb52a22b6becb42a91d3686a4c901cf52eee16234214d0b5b2da4c46", weight: 1 }, // Triton One
	{ objectId: "0x3c93ec1474454e1b47cf485a4e5361a5878d722b9492daf10ef626a76adc3dad", weight: 1 }, // Natsai
	{ objectId: "0x6a0726a1ea3d62ba2f2ae51104f2c3633c003fb75621d06fde47f04dc930ba06", weight: 1 }, // Mhax.io
];

let sealClient: SealClient | null = null;
let keyServersCache: Array<{ objectId: string; weight: number }> | null = null;

async function fetchKeyServersFromRegistry(): Promise<Array<{ objectId: string; weight: number }>> {
	try {
		const network = config.suiNetwork as "mainnet" | "testnet" | "devnet" | "localnet";
		const client = new SuiClient({ url: config.suiRpcUrl });

		// Query on-chain registry for key servers
		const registryObject = await client.getObject({
			id: SEAL_TESTNET_PACKAGE_ID,
			options: { showContent: true },
		});

		if (registryObject.data?.content && "fields" in registryObject.data.content) {
			const keyServers = (registryObject.data.content.fields as any).key_servers;
			if (Array.isArray(keyServers)) {
				return keyServers.map((ks: any) => ({
					objectId: ks.objectId || ks,
					weight: 1,
				}));
			}
		}
	} catch (error) {
		console.warn("[SEAL] Failed to fetch key servers from registry, using fallback");
	}

	return VERIFIED_TESTNET_KEY_SERVERS;
}

async function getSealClient(): Promise<SealClient | null> {
	if (!sealClient) {
		try {
			const network = config.suiNetwork as "mainnet" | "testnet" | "devnet" | "localnet";
			
			if (network !== "testnet") {
				console.warn("[SEAL] Only testnet supported, using fallback");
				return null;
			}

			// Fetch key servers
			if (!keyServersCache) {
				keyServersCache = await fetchKeyServersFromRegistry();
			}

			if (keyServersCache.length === 0) {
				console.warn("[SEAL] No key servers available");
				return null;
			}

			// Initialize SealClient (using SuiJsonRpcClient pattern from seal.ts)
			const { SuiJsonRpcClient } = await import("@mysten/sui/jsonRpc");
			const suiClient = new SuiJsonRpcClient({
				url: config.suiRpcUrl,
			});

			sealClient = new SealClient({
				suiClient: suiClient as any,
				serverConfigs: keyServersCache,
			});

			console.log(`[SEAL] ✅ Initialized with ${keyServersCache.length} key servers`);
		} catch (error: any) {
			console.error("[SEAL] Failed to initialize:", error?.message || error);
			return null;
		}
	}
	return sealClient;
}

/**
 * Encrypt audit payload JSON before uploading to Walrus
 * Returns encrypted data and txBytes (required for decryption)
 */
export async function encryptAuditPayload(
	auditPayload: unknown,
	userAddress?: string
): Promise<{
	encryptedData: string; // Base64 encoded encrypted data
	txBytes: string; // Base64 encoded transaction bytes (required for decryption)
}> {
	try {
		const seal = await getSealClient();
		if (!seal) {
			// Fallback: return plain JSON (no encryption)
			console.warn("[SEAL] Seal client not available, storing plain audit payload");
			return {
				encryptedData: JSON.stringify(auditPayload),
				txBytes: "",
			};
		}

		const dataBuffer = Buffer.from(JSON.stringify(auditPayload), "utf-8");
		const id = userAddress || "0x0000000000000000000000000000000000000000000000000000000000000000";
		const policyPackageId = config.sealPolicyPackageId || SEAL_TESTNET_PACKAGE_ID;

		// Encrypt using Seal SDK (following pattern from seal.ts)
		const encrypted = await seal.encrypt({
			packageId: policyPackageId,
			id,
			threshold: 1,
			data: new Uint8Array(dataBuffer),
		});

		// Extract txBytes from encrypt response (required for decryption)
		const txBytesArray = (encrypted as any).txBytes || (encrypted as any).transactionBytes || new Uint8Array();
		const encryptedObject = encrypted.encryptedObject || encrypted;

		// Store encrypted object and txBytes as JSON (base64 encoded)
		const payloadToStore = {
			encryptedObject: encryptedObject,
			txBytes: Array.from(txBytesArray), // Convert Uint8Array to array for JSON
		};

		// Convert to base64 for storage
		const encryptedData = Buffer.from(JSON.stringify(payloadToStore)).toString("base64");
		const txBytes = Buffer.from(txBytesArray).toString("base64");

		console.log(`[SEAL] ✅ Encrypted audit payload (${dataBuffer.length} bytes -> ${encryptedData.length} chars)`);

		return {
			encryptedData,
			txBytes,
		};
	} catch (error: any) {
		console.error("[SEAL] Encryption error:", error?.message || error);
		// Fallback: return plain JSON
		return {
			encryptedData: JSON.stringify(auditPayload),
			txBytes: "",
		};
	}
}

/**
 * Decrypt audit payload JSON after reading from Walrus
 * Requires encryptedData and txBytes from encryption
 */
export async function decryptAuditPayload(
	encryptedData: string, // Base64 encoded encrypted data
	txBytes: string, // Base64 encoded transaction bytes
	sessionKey?: string // Optional session key (if user provided)
): Promise<unknown> {
	try {
		const seal = await getSealClient();
		if (!seal) {
			// Fallback: try to parse as plain JSON
			console.warn("[SEAL] Seal client not available, trying plain JSON");
			return JSON.parse(encryptedData);
		}

		// If no txBytes, assume it's plain JSON
		if (!txBytes || txBytes === "") {
			return JSON.parse(encryptedData);
		}

		// Convert from base64
		const storedPayload = JSON.parse(Buffer.from(encryptedData, "base64").toString("utf-8"));
		const encryptedObject = storedPayload.encryptedObject || storedPayload;
		const txBytesArray = storedPayload.txBytes 
			? new Uint8Array(storedPayload.txBytes)
			: Buffer.from(txBytes, "base64");

		// Convert encrypted object to proper format for Seal SDK
		// Seal SDK expects encryptedObject directly
		let encryptedDataForSeal: any = encryptedObject;
		if (Array.isArray(encryptedObject)) {
			encryptedDataForSeal = new Uint8Array(encryptedObject);
		} else if (typeof encryptedObject === "string") {
			encryptedDataForSeal = Buffer.from(encryptedObject, "base64");
		}

		// Decrypt using Seal SDK (following pattern from seal.ts)
		const decryptParams: any = {
			data: encryptedDataForSeal,
			txBytes: txBytesArray instanceof Uint8Array ? txBytesArray : new Uint8Array(txBytesArray),
		};
		
		// Add sessionKey only if provided
		if (sessionKey) {
			decryptParams.sessionKey = new Uint8Array(Buffer.from(sessionKey, "base64"));
		}
		
		const decrypted = await seal.decrypt(decryptParams);

		// Parse decrypted JSON
		const auditPayload = JSON.parse(Buffer.from(decrypted).toString("utf-8"));

		console.log(`[SEAL] ✅ Decrypted audit payload (${encryptedData.length} chars -> ${Buffer.from(decrypted).length} bytes)`);

		return auditPayload;
	} catch (error: any) {
		console.error("[SEAL] Decryption error:", error?.message || error);
		// Fallback: try to parse as plain JSON
		try {
			return JSON.parse(encryptedData);
		} catch {
			throw new Error(`Failed to decrypt audit payload: ${error?.message || error}`);
		}
	}
}

