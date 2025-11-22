import dotenv from "dotenv";
import { getFullnodeUrl } from "@mysten/sui/client";
dotenv.config();

// Deployed Policy Package Info (testnet)
const DEPLOYED_POLICY_PACKAGE_ID = "0x1c2dd5cfaecda72a2d1fbeb48032be68667d760a4f56fa93848a004701d700f8";
const DEPLOYED_UPGRADE_CAP = "0x9f2739b93ce61f8c950d6a1239bb463928bdecde20b00d6e8d8612b439a4c9f4";
const DEPLOYED_SENDER = "0x2ec5d97a5d01a48ae92bdcc63cc3b69bd6b4c89978ff8d5852317ad8ab966ee8";
const DEPLOYED_RPC = "https://sui-testnet-rpc.publicnode.com";

export const config = {
	coordinatorPort: Number(process.env.COORDINATOR_PORT || 3002),
	maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 200),
	suiNetwork: process.env.SUI_NETWORK || "testnet", // Used by Walrus and Sui SDKs
	// Custom RPC URL (optional - defaults to PublicNode RPC or getFullnodeUrl if network differs)
	suiRpcUrl: process.env.SUI_RPC_URL || (process.env.SUI_NETWORK === "testnet" ? DEPLOYED_RPC : getFullnodeUrl((process.env.SUI_NETWORK as "mainnet" | "testnet" | "devnet" | "localnet") || "testnet")),
	// Seal Policy Package (deployed to testnet)
	sealPolicyPackageId: process.env.SEAL_POLICY_PACKAGE_ID || DEPLOYED_POLICY_PACKAGE_ID,
	sealPolicyModule: process.env.SEAL_POLICY_MODULE || "policy",
	sealPolicyFunction: process.env.SEAL_POLICY_FUNCTION || "seal_approve_entry",
	// Deployment info (for reference)
	deployedUpgradeCap: DEPLOYED_UPGRADE_CAP,
	deployedSender: DEPLOYED_SENDER,
	deployedRpc: DEPLOYED_RPC,
};

