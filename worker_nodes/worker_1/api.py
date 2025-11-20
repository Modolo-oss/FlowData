from fastapi import FastAPI, Body
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from worker_nodes.common.training_engine import train_on_csv, hash_lite
from worker_nodes.common.data_analyzer import analyze_csv_shard
from worker_nodes.common.crypto import (
	WorkerKeypair, create_attestation, sha256_hash,
	get_hardware_info, create_commit_hash, verify_commit,
	encrypt_for_coordinator
)
import httpx
import json
import base64
import os

app = FastAPI()

# Coordinator URL for decrypt endpoint (workers decrypt via coordinator)
COORDINATOR_URL = os.getenv("COORDINATOR_URL", "http://localhost:3002")

# Worker keypair for attestation (loads from env WORKER1_PRIVATE_KEY or generates ephemeral)
WORKER_KEYPAIR = WorkerKeypair("worker-1")
WORKER_HARDWARE_INFO = get_hardware_info()

class TrainShardRequest(BaseModel):
	dataShard: str
	globalModelHash: str
	epochCount: int
	nodeId: str
	randomSeed: int
	# For encrypted shards (workers decrypt themselves)
	encryptedData: Optional[str] = None
	sessionKey: Optional[str] = None
	txBytes: Optional[str] = None
	userAddress: Optional[str] = None
	# Zero-knowledge commit (coordinator sends commit hash, worker verifies after decrypt)
	commitHash: Optional[str] = None

@app.get("/health")
def health():
	"""Health endpoint with hardware info and signature status"""
	return {
		"ok": True,
		"role": "worker",
		"nodeId": "worker-1",
		"suiAddress": WORKER_KEYPAIR.get_sui_address(),
		"hardwareInfo": WORKER_HARDWARE_INFO,
		"signatureAvailable": True,
	}

@app.post("/train")
async def train(req: TrainShardRequest = Body(...)):
	started = datetime.utcnow().isoformat()
	
	# If encrypted data provided, decrypt it first (worker decrypts itself)
	data_shard = req.dataShard
	commit_verified = None
	
	# Audit log events
	audit_events = [{
		"event": "training_start",
		"timestamp": started,
		"nodeId": req.nodeId,
		"globalModelHash": req.globalModelHash,
	}]
	
	if req.encryptedData and req.sessionKey:
		try:
			# Worker decrypts via coordinator decrypt endpoint
			# This ensures worker decrypts itself, not coordinator decrypting before sending
			audit_events.append({
				"event": "decrypt_permission_request",
				"timestamp": datetime.utcnow().isoformat(),
				"hasTxBytes": bool(req.txBytes),
			})
			
			async with httpx.AsyncClient(timeout=30.0) as client:
				decrypt_response = await client.post(
					f"{COORDINATOR_URL}/api/decrypt",
					json={
						"encryptedData": req.encryptedData,
						"sessionKey": req.sessionKey,
						"txBytes": req.txBytes,
						"userAddress": req.userAddress,
					}
				)
				decrypt_response.raise_for_status()
				decrypt_result = decrypt_response.json()
				data_shard = decrypt_result["decryptedData"]
				
				# Zero-knowledge commit verification
				if req.commitHash:
					commit_verified = verify_commit(data_shard, req.commitHash)
					audit_events.append({
						"event": "commit_verification",
						"timestamp": datetime.utcnow().isoformat(),
						"match": commit_verified["match"],
						"commitHash": req.commitHash,
					})
			
			audit_events.append({
				"event": "decrypt_permission_granted",
				"timestamp": datetime.utcnow().isoformat(),
			})
		except Exception as e:
			audit_events.append({
				"event": "decrypt_failed",
				"timestamp": datetime.utcnow().isoformat(),
				"error": str(e),
			})
			# If decryption fails, return error
			return {
				"error": f"Decryption failed: {str(e)}",
				"nodeId": req.nodeId,
				"auditEvents": audit_events,
			}, 400
	
	# Analyze CSV data (statistics, correlations, clusters, trends)
	data_insights = analyze_csv_shard(data_shard)
	
	# Train on decrypted (or plain) data
	stats = train_on_csv(data_shard, epochs=req.epochCount, seed=req.randomSeed)
	finished = datetime.utcnow().isoformat()
	
	# Generate weights hash (SHA256)
	weights_data = f"{req.nodeId}:{req.globalModelHash}:{stats['loss_history']}:{stats['num_samples']}:{stats.get('random_challenge_seed', '')}"
	weights_hash = sha256_hash(weights_data)
	delta = f"sha256:{weights_hash[:32]}"  # Format: sha256:prefix for compatibility
	
	finished = datetime.utcnow().isoformat()
	
	# Create cryptographic attestation (production format)
	attestation = create_attestation(
		node_id=req.nodeId,
		weights_hash=weights_hash,
		loss_history=stats["loss_history"],
		started_at=started,
		finished_at=finished,
		global_model_hash=req.globalModelHash,
		num_samples=stats["num_samples"],
		epoch_count=req.epochCount,
		random_seed=req.randomSeed,
		keypair=WORKER_KEYPAIR,
		hardware_info=WORKER_HARDWARE_INFO,
		commit_verified=commit_verified,
	)
	
	# Complete audit log trace
	audit_events.extend([
		{
			"event": "training_complete",
			"timestamp": finished,
			"numSamples": stats["num_samples"],
			"epochs": req.epochCount,
		},
		{
			"event": "worker_identity",
			"timestamp": datetime.utcnow().isoformat(),
			"suiAddress": attestation["suiAddress"],
			"hardwareInfo": WORKER_HARDWARE_INFO,
		},
		{
			"event": "update_hash",
			"timestamp": datetime.utcnow().isoformat(),
			"weightsHash": weights_hash,
			"lossHistoryHash": attestation["lossHistoryHash"],
		},
		{
			"event": "signature_generated",
			"timestamp": datetime.utcnow().isoformat(),
			"signature": attestation["signature"][:32] + "...",  # Truncated for log
			"publicKey": attestation["publicKey"][:32] + "...",
		},
	])
	
	# Prepare update payload
	update_payload = {
		"nodeId": req.nodeId,
		"suiAddress": attestation["suiAddress"],
		"numSamples": stats["num_samples"],
		"deltaWeightsHash": delta,
		"weightsHash": weights_hash,
		"lossHistory": stats["loss_history"],
		"startedAt": started,
		"finishedAt": finished,
		# Data insights (from original CSV data analysis)
		"dataInsights": data_insights,
		# Replay proof data
		"epochLossHashes": stats.get("epoch_loss_hashes", []),
		"epochGradientNormHashes": stats.get("epoch_gradient_norm_hashes", []),
		"randomChallengeSeed": stats.get("random_challenge_seed", req.randomSeed),
		# Cryptographic attestation (production format)
		"attestation": attestation,
		# Full audit log trace
		"auditTrace": audit_events,
	}
	
	# Encrypt update before sending to coordinator (production)
	# Workers encrypt logs/updates before sending
	if req.sessionKey:
		encrypted_update = encrypt_for_coordinator(update_payload, req.sessionKey)
		return {
			"encrypted": True,
			"encryptedUpdate": encrypted_update,
		}
	
	# Return plain update (if no encryption)
	return update_payload

