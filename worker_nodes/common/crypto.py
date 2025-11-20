"""
Cryptographic utilities for worker attestation, encryption, and Sui integration
"""
import hashlib
import base64
import platform
import json
try:
	import psutil
	PSUTIL_AVAILABLE = True
except ImportError:
	PSUTIL_AVAILABLE = False
from typing import Dict, Any, List, Optional, Union
from datetime import datetime

# For cryptographic signatures (Ed25519)
try:
	from cryptography.hazmat.primitives.asymmetric import ed25519
	from cryptography.hazmat.primitives import serialization
	ED25519_AVAILABLE = True
except ImportError:
	ED25519_AVAILABLE = False
	print("Warning: cryptography library not available, using mock signatures")

# For Sui keypair (can use pysui in future)
import secrets
import os

class WorkerKeypair:
	"""Ed25519 keypair for worker attestation"""
	
	def __init__(self, node_id: str):
		self.node_id = node_id
		self._keypair = None
		self._public_key_bytes = None
		self._private_key_bytes = None
		
		# Try to load Sui private key from env (WORKER1_PRIVATE_KEY, WORKER2_PRIVATE_KEY)
		# Or use worker-specific env var
		env_key_name = f"WORKER_{node_id.upper().replace('-', '_')}_PRIVATE_KEY"
		private_key_env = os.getenv(env_key_name) or os.getenv(f"{node_id.upper().replace('-', '_')}_PRIVATE_KEY")
		
		if private_key_env:
			try:
				# Try base64 decode
				self._private_key_bytes = base64.b64decode(private_key_env)
			except:
				try:
					# Try hex decode
					self._private_key_bytes = bytes.fromhex(private_key_env)
				except:
					# Try as raw bytes string
					self._private_key_bytes = private_key_env.encode('utf-8')[:32]
		else:
			# Generate ephemeral keypair (store in env or file for production)
			if ED25519_AVAILABLE:
				self._keypair = ed25519.Ed25519PrivateKey.generate()
				self._private_key_bytes = self._keypair.private_bytes(
					encoding=serialization.Encoding.Raw,
					format=serialization.PrivateFormat.Raw,
					encryption_algorithm=serialization.NoEncryption()
				)
			else:
				# Mock keypair for development
				self._private_key_bytes = secrets.token_bytes(32)
		
		if ED25519_AVAILABLE and not self._keypair:
			# Load from private key bytes
			self._keypair = ed25519.Ed25519PrivateKey.from_private_bytes(self._private_key_bytes)
		
		# Get public key
		if ED25519_AVAILABLE:
			public_key = self._keypair.public_key()
			self._public_key_bytes = public_key.public_bytes(
				encoding=serialization.Encoding.Raw,
				format=serialization.PublicFormat.Raw
			)
		else:
			# Mock public key (derived from private for consistency)
			self._public_key_bytes = hashlib.sha256(self._private_key_bytes).digest()[:32]
	
	def sign(self, message: bytes) -> bytes:
		"""Sign a message with Ed25519"""
		if ED25519_AVAILABLE and self._keypair:
			signature = self._keypair.sign(message)
			return signature
		else:
			# Mock signature for development
			return hashlib.sha256(self._private_key_bytes + message).digest()
	
	def get_public_key_base64(self) -> str:
		"""Get public key as base64 string"""
		return base64.b64encode(self._public_key_bytes).decode('utf-8')
	
	def get_public_key_hex(self) -> str:
		"""Get public key as hex string (for Sui address generation)"""
		return self._public_key_bytes.hex()
	
	def get_sui_address(self) -> str:
		"""
		Get Sui address from public key
		Note: This is a simplified version. In production, use proper Sui address derivation.
		For now, we'll use a prefix + hex format.
		"""
		# Simplified: Use 0x prefix + hex of public key (first 32 bytes)
		return "0x" + self._public_key_bytes.hex()[:64]

def sha256_hash(data: Union[str, bytes]) -> str:
	"""SHA256 hash of data, returns hex string"""
	if isinstance(data, str):
		data = data.encode('utf-8')
	return hashlib.sha256(data).hexdigest()

def get_hardware_info() -> Dict[str, Any]:
	"""Get hardware information for worker attestation"""
	if PSUTIL_AVAILABLE:
		try:
			return {
				"cpu_cores": psutil.cpu_count(logical=True),
				"cpu_physical_cores": psutil.cpu_count(logical=False),
				"memory_gb": round(psutil.virtual_memory().total / (1024**3), 2),
				"platform": platform.platform(),
				"processor": platform.processor() or "unknown",
			}
		except:
			pass
	
	return {
		"cpu_cores": 1,
		"cpu_physical_cores": 1,
		"memory_gb": 0,
		"platform": platform.platform(),
		"processor": "unknown",
	}

def create_commit_hash(plaintext_data: str) -> str:
	"""
	Create commit hash for zero-knowledge verification
	Coordinator creates commit = hash(shardPlaintext)
	Worker verifies after decrypt by hashing plaintext and comparing
	"""
	return sha256_hash(plaintext_data)

def verify_commit(plaintext_data: str, commit_hash: str) -> Dict[str, Any]:
	"""
	Verify commit hash (zero-knowledge commit verification)
	Worker hashes plaintext after decrypt and compares with commit
	"""
	computed_hash = sha256_hash(plaintext_data)
	match = computed_hash == commit_hash
	
	return {
		"match": match,
		"computedHash": computed_hash,
		"commitHash": commit_hash,
		"verified": match,
	}

def create_attestation(
	node_id: str,
	weights_hash: str,
	loss_history: List[float],
	started_at: str,
	finished_at: str,
	global_model_hash: str,
	num_samples: int,
	epoch_count: int,
	random_seed: int,
	keypair: WorkerKeypair,
	hardware_info: Optional[Dict[str, Any]] = None,
	commit_verified: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
	"""
	Create cryptographic attestation for worker update (production format)
	
	Production format:
	{
		"nodeId": "worker-1",
		"suiAddress": "0xabc...",
		"signature": "base64_ed25519_signature",
		"weightsHash": "sha256:2ab34f...",
		"lossHistoryHash": "sha256:...",
		"hardwareInfo": {...},
		"commitVerified": {...}
	}
	"""
	# Create message to sign
	# Include: weightsHash, loss_history hash, timestamps, nodeId, hardware info
	loss_history_hash = sha256_hash(",".join(map(str, loss_history)))
	
	message_parts = [
		f"nodeId:{node_id}",
		f"weightsHash:{weights_hash}",
		f"lossHistoryHash:{loss_history_hash}",
		f"startedAt:{started_at}",
		f"finishedAt:{finished_at}",
		f"globalModelHash:{global_model_hash}",
		f"numSamples:{num_samples}",
		f"epochCount:{epoch_count}",
		f"randomSeed:{random_seed}",
	]
	
	if hardware_info:
		message_parts.append(f"hardware:{json.dumps(hardware_info, sort_keys=True)}")
	
	if commit_verified:
		message_parts.append(f"commitVerified:{commit_verified.get('match', False)}")
		message_parts.append(f"commitHash:{commit_verified.get('commitHash', '')}")
	
	message = "\n".join(message_parts)
	message_bytes = message.encode('utf-8')
	
	# Sign with keypair
	signature_bytes = keypair.sign(message_bytes)
	signature_base64 = base64.b64encode(signature_bytes).decode('utf-8')
	public_key_base64 = keypair.get_public_key_base64()
	sui_address = keypair.get_sui_address()
	
	return {
		"message": message,
		"signature": signature_base64,
		"publicKey": public_key_base64,
		"signerPubKey": public_key_base64,  # Alias for compatibility
		"weightsHash": weights_hash,
		"lossHistoryHash": loss_history_hash,
		"suiAddress": sui_address,
		"hardwareInfo": hardware_info or get_hardware_info(),
		"commitVerified": commit_verified,
	}

def encrypt_for_coordinator(data: Dict[str, Any], session_key: Optional[str] = None) -> Dict[str, Any]:
	"""
	Encrypt worker update/logs before sending to coordinator
	In production, workers encrypt updates before sending
	"""
	# For now, return as-is with encryption flag (actual encryption can be added)
	# In production: Use Seal encryption or symmetric encryption
	data_json = json.dumps(data, sort_keys=True)
	
	if session_key:
		# If session key provided, could encrypt here
		# For MVP: Just base64 encode as placeholder
		encrypted_data = base64.b64encode(data_json.encode('utf-8')).decode('utf-8')
		return {
			"encrypted": True,
			"data": encrypted_data,
			"encryption": "base64",  # Placeholder - use Seal or AES in production
		}
	
	# Return plain if no session key
	return {
		"encrypted": False,
		"data": data_json,
	}

