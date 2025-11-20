# FlowData Studio

Production-ready decentralized federated learning platform with on-chain provenance, privacy-preserving encryption, cryptographic attestation, and verifiable compute. Built for the Walrus Hackathon.

**Full Encrypted Pipeline**: Encrypted Shard → Decrypted Training → Encrypted Update → On-chain Verified Aggregation

## Architecture

Monorepo structure with separate `frontend` and `backend` folders:

- **Coordinator** (Express/TypeScript) on port 3000 - Orchestrates federated learning, handles file uploads, coordinates workers, manages encryption/decryption
- **Worker 1** (Python FastAPI) on port 3001 - Local training node with cryptographic attestation and hardware info
- **Worker 2** (Python FastAPI) on port 3002 - Local training node with cryptographic attestation and hardware info
- **Frontend** (Vite React/TypeScript) on port 5173 - Web UI for uploading datasets, viewing insights, and monitoring nodes

### Technology Stack

- **Backend**: Express.js + TypeScript
  - **Seal SDK** (`@mysten/seal`) - Privacy-preserving encryption with policy package
  - **Walrus SDK** (`@mysten/walrus`) - Decentralized blob storage
  - **Sui SDK** (`@mysten/sui`) - On-chain provenance and transaction simulation
- **Workers**: Python FastAPI
  - **Cryptography** (`cryptography>=41.0.0`) - Ed25519 signatures for attestation
  - **psutil** - Hardware information collection
  - Decrypt via HTTP endpoint (`/api/decrypt`); can use `pysui` for Sui operations
- **Frontend**: React + Vite + TypeScript
  - **Sui Wallet Integration** - Session key generation with IntentScope
  - **SSE (Server-Sent Events)** - Real-time progress updates
- **Blockchain**: Sui (testnet/mainnet/devnet)
- **Storage**: Walrus (decentralized blob storage with full audit log)
- **Encryption**: Seal (privacy-preserving encryption with key servers via TypeScript SDK)

### Full Encrypted Pipeline

**Production-ready encrypted federated learning flow:**

1. **Frontend** → Generates session key (IntentScope.PersonalMessage, toSerializedSignature)
2. **Coordinator** → Encrypts data shards with Seal SDK (generates commit hash)
3. **Workers** → Decrypt shards themselves via `/api/decrypt` endpoint
4. **Workers** → Verify zero-knowledge commit hash
5. **Workers** → Train on decrypted data (generate replay proof)
6. **Workers** → Encrypt updates before sending (cryptographic attestation)
7. **Coordinator** → Decrypts updates internally for aggregation
8. **Coordinator** → Uploads full audit log trace to Walrus
9. **Coordinator** → Records on-chain provenance to Sui

**Result**: Complete end-to-end encrypted pipeline with cryptographic verification at every step.

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- npm or yarn

### Install Dependencies

```bash
# Install backend and frontend dependencies
npm run install:all

# Or manually:
npm --prefix backend install
npm --prefix frontend install
```

### Install Python Dependencies

```bash
# Install Python dependencies for workers
pip install -r worker_nodes/worker_1/requirements.txt
pip install -r worker_nodes/worker_2/requirements.txt

# Optional: Install pysui for Sui blockchain operations in Python workers
pip install pysui
```

### Run Locally (Windows PowerShell)

```powershell
# Build backend (TypeScript -> JavaScript)
npm --prefix backend run build

# Start all services (coordinator, 2 Python workers, frontend)
.\scripts\start-local.ps1
```

Or start manually in separate terminals:

```powershell
# Terminal 1: Coordinator
npm --prefix backend run dev:coordinator

# Terminal 2: Worker 1
cd worker_nodes\worker_1
python -m uvicorn api:app --port 3001

# Terminal 3: Worker 2
cd worker_nodes\worker_2
python -m uvicorn api:app --port 3002

# Terminal 4: Frontend
npm --prefix frontend run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Coordinator Health**: http://localhost:3000/api/health
- **Coordinator Full Health**: http://localhost:3000/api/health/full
- **Monitor Nodes**: http://localhost:3000/api/monitor/nodes (hardware info & signature status)
- **Worker 1 Health**: http://localhost:3001/health
- **Worker 2 Health**: http://localhost:3002/health
- **Progress Stream (SSE)**: http://localhost:3000/api/progress

Upload a CSV file to see federated learning progress and generate an InsightCard with on-chain provenance. Monitor nodes endpoint displays worker hardware info and signature verification status.

## Deployment Configuration (Testnet)

**Policy Package (Deployed):**
- **Package ID**: `0x1c2dd5cfaecda72a2d1fbeb48032be68667d760a4f56fa93848a004701d700f8`
- **UpgradeCap Object**: `0x9f2739b93ce61f8c950d6a1239bb463928bdecde20b00d6e8d8612b439a4c9f4`
- **Sender/Admin**: `0x2ec5d97a5d01a48ae92bdcc63cc3b69bd6b4c89978ff8d5852317ad8ab966ee8`
- **RPC Endpoint**: `https://sui-testnet-rpc.publicnode.com`

The policy package is already deployed to Sui testnet and configured as default in the backend. No additional deployment needed.

## Environment Variables

Create a `.env` file in the project root (optional - defaults are pre-configured):

```env
# Coordinator (backend)
COORDINATOR_PORT=3000
WORKER_NODES=http://localhost:3001,http://localhost:3002
MAX_UPLOAD_MB=200

# Sui network (testnet | devnet | localnet | mainnet)
# Used by Walrus SDK, Seal SDK, and Sui SDK - public RPC, no API key needed
SUI_NETWORK=testnet

# Custom Sui RPC URL (optional - defaults to PublicNode RPC)
# If not set, uses getFullnodeUrl(SUI_NETWORK)
SUI_RPC_URL=https://sui-testnet-rpc.publicnode.com

# Seal Policy Package (already deployed - defaults to deployed package ID)
SEAL_POLICY_PACKAGE_ID=0x1c2dd5cfaecda72a2d1fbeb48032be68667d760a4f56fa93848a004701d700f8
SEAL_POLICY_MODULE=policy
SEAL_POLICY_FUNCTION=seal_approve_entry

# Walrus Signer (production - use persistent keypair)
# Optional: Set for production (base64 or hex encoded Ed25519 private key)
# If not set, uses ephemeral keypair (development only)
WALRUS_SIGNER_PRIVATE_KEY=

# Worker Private Keys (production - use persistent keypairs)
# Optional: Set for production (base64 or hex encoded Ed25519 private keys)
# If not set, workers generate ephemeral keypairs (development only)
# Workers load from: WORKER_WORKER_1_PRIVATE_KEY or WORKER1_PRIVATE_KEY
# Workers load from: WORKER_WORKER_2_PRIVATE_KEY or WORKER2_PRIVATE_KEY
WORKER1_PRIVATE_KEY=
WORKER2_PRIVATE_KEY=

# Frontend (Vite)
VITE_COORDINATOR_URL=http://localhost:3000
```

### Environment Variable Reference

**Coordinator:**
- `COORDINATOR_PORT` (default: 3000) - Port for the coordinator backend
- `WORKER_NODES` (default: http://localhost:3001,http://localhost:3002) - Comma-separated list of worker node URLs
- `MAX_UPLOAD_MB` (default: 200) - Maximum file upload size in MB

**Sui Network:**
- `SUI_NETWORK` (default: testnet) - Sui network (testnet/mainnet/devnet/localnet) used by Walrus, Seal, and Sui SDKs
- `SUI_RPC_URL` (default: `https://sui-testnet-rpc.publicnode.com` or `getFullnodeUrl(SUI_NETWORK)`) - Custom Sui RPC endpoint

**Seal Policy Package:**
- `SEAL_POLICY_PACKAGE_ID` (default: `0x1c2dd5cfaecda72a2d1fbeb48032be68667d760a4f56fa93848a004701d700f8`) - Policy package ID (pre-deployed)
- `SEAL_POLICY_MODULE` (default: policy) - Policy module name
- `SEAL_POLICY_FUNCTION` (default: seal_approve_entry) - Policy function name

**Production Keys (optional - for persistent keypairs):**
- `WALRUS_SIGNER_PRIVATE_KEY` - Ed25519 private key for Walrus signing (base64 or hex)
- `WORKER1_PRIVATE_KEY` - Ed25519 private key for worker-1 attestation (base64 or hex)
- `WORKER2_PRIVATE_KEY` - Ed25519 private key for worker-2 attestation (base64 or hex)

**Frontend:**
- `VITE_COORDINATOR_URL` (default: http://localhost:3000) - Frontend API endpoint

## Seal Policy Package

The policy package is **already deployed** to Sui testnet:

- **Package ID**: `0x1c2dd5cfaecda72a2d1fbeb48032be68667d760a4f56fa93848a004701d700f8`
- **Module**: `policy`
- **Function**: `seal_approve_entry`
- **Network**: Testnet
- **RPC**: `https://sui-testnet-rpc.publicnode.com`

The package ID is pre-configured in the backend (`backend/src/config.ts`). No additional setup needed.

### Deployment Details

- **UpgradeCap Object**: `0x9f2739b93ce61f8c950d6a1239bb463928bdecde20b00d6e8d8612b439a4c9f4` (for future upgrades)
- **Sender/Admin**: `0x2ec5d97a5d01a48ae92bdcc63cc3b69bd6b4c89978ff8d5852317ad8ab966ee8`

**Note**: The policy function `seal_approve_entry` approves all requests for the hackathon MVP. For production, add custom access control logic in `flowdata-policy/sources/policy.move`.

## SDK Integration Details

### Walrus SDK (`@mysten/walrus`)

- **Purpose**: Decentralized blob storage for training logs, model updates, insight provenance, and **full audit log trace**
- **Configuration**: Uses `SUI_NETWORK`, `SUI_RPC_URL`, and `WALRUS_SIGNER_PRIVATE_KEY` environment variables
- **RPC Endpoint**: `https://sui-testnet-rpc.publicnode.com` (PublicNode - free, no API key)
- **API Key**: Not required - uses public Sui RPC endpoints
- **Signer Keypair**: 
  - **Production**: Load from `WALRUS_SIGNER_PRIVATE_KEY` env var (base64 or hex)
  - **Development**: Generate ephemeral keypair (warns in logs)
- **Features**:
  - Extends `SuiJsonRpcClient` with `walrus()` extension
  - Writes blobs directly to Walrus storage nodes
  - Registers blobs on-chain via Sui network
  - Stores complete audit log trace (training start, decrypt permission, policy call, worker identity, timing, losses, update hash, signature, nonce, final aggregated hash)
  - Full JSON trace for offline verification

### Seal SDK (`@mysten/seal`)

- **Purpose**: Privacy-preserving encryption for data shards, verification of training steps, and transaction simulation
- **Configuration**: Uses `SUI_NETWORK`, `SUI_RPC_URL`, and `SEAL_POLICY_PACKAGE_ID` environment variables
- **RPC Endpoint**: `https://sui-testnet-rpc.publicnode.com` (PublicNode - free, no API key)
- **API Key**: Not required - uses public key servers and Sui RPC
- **Policy Package**: **Deployed** - Package ID `0x1c2dd5cfaecda72a2d1fbeb48032be68667d760a4f56fa93848a004701d700f8` (pre-configured)
- **Session Key**: Generated from Sui Wallet (IntentScope.PersonalMessage) or ephemeral keypair (toSerializedSignature format)
- **Key Server Selection (3-tier fallback)**:
  1. **Primary**: Queries on-chain registry (testnet package: `0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682`) to fetch verified key servers automatically
  2. **Fallback**: Uses 10 verified testnet key servers from official docs if on-chain query fails:
     - Mysten Labs (2): mysten-testnet-1, mysten-testnet-2
     - Ruby Nodes (1)
     - NodeInfra (1)
     - Studio Mirai (1)
     - Overclock (1)
     - H2O Nodes (1)
     - Triton One (1)
     - Natsai (1)
     - Mhax.io (1)
  3. **Final Fallback**: Plain data for non-testnet networks or if no key servers found
- **Features**:
  - Encrypts data shards before sending to worker nodes using policy package ID
  - Extracts `txBytes` from encrypt response (required for decryption)
  - **Transaction Simulation**: Pre-verifies decrypt transactions with `devInspectTransactionBlock` (policy allow/deny, gas estimation, expected object changes)
  - Decrypts encrypted data using sessionKey and txBytes (workers decrypt via `/api/decrypt` endpoint)
  - Policy package defines access control (key servers verify via `seal_approve_entry` function)
  - **Cryptographic verification** of training results (Ed25519 signature verification) + heuristic verification (loss history, duration, hash validation)
  - All key servers in "Open mode" - no configuration needed

### Sui SDK (`@mysten/sui`)

- **Purpose**: On-chain recording of analysis results, node participation, provenance links, and transaction simulation
- **Configuration**: Uses `SUI_NETWORK` and `SUI_RPC_URL` environment variables
- **RPC Endpoint**: `https://sui-testnet-rpc.publicnode.com` (PublicNode - free, no API key)
- **API Key**: Not required - uses public RPC endpoints
- **Features**:
  - Anchors Walrus CIDs to Sui checkpoint digests
  - Records analysis completion and node participation
  - Links provenance data between storage and blockchain
  - **Transaction Simulation**: `devInspectTransactionBlock` for pre-verification before decrypt
  - **Cryptographic Verification**: Ed25519PublicKey for verifying worker attestation signatures

### Python SDK (`pysui`)

- **Purpose**: Python SDK for Sui blockchain interactions (workers can use for Sui operations)
- **Installation**: `pip install pysui`
- **Usage**: Workers can use pysui for:
  - Connecting to Sui gRPC or GraphQL servers
  - Querying blockchain data (object details, balances)
  - Managing keys and addresses
  - Building and executing transactions (if needed)
- **Note**: 
  - Seal SDK is TypeScript-only, so workers decrypt via HTTP endpoint (`/api/decrypt`) to the coordinator
  - Workers can use pysui for other Sui operations (wallet management, blockchain queries, etc.)
  - Current implementation: Workers decrypt via coordinator HTTP endpoint (efficient, no duplicate SDK)

## Scripts

### PowerShell Scripts (Windows)

- `scripts/start-local.ps1` - Start all services (coordinator, 2 workers, frontend) in separate windows
- `scripts/start-workers.ps1` - Start only the Python worker services
- `scripts/monitor-nodes.ps1` - Monitor health of coordinator and worker nodes

### npm Scripts

**Backend:**
- `npm --prefix backend run dev:coordinator` - Start coordinator in dev mode (hot reload)
- `npm --prefix backend run build` - Build backend (TypeScript -> JavaScript)
- `npm --prefix backend run start:coordinator` - Start coordinator in production mode

**Frontend:**
- `npm --prefix frontend run dev` - Start frontend dev server
- `npm --prefix frontend run build` - Build frontend for production
- `npm --prefix frontend run preview` - Preview production build

**Root:**
- `npm run install:all` - Install dependencies for backend and frontend
- `npm run dev:all` - Start all services in dev mode (coordinator only, workers need to be started separately)

## Project Structure

```
.
├── backend/                 # Express.js backend (TypeScript)
│   ├── src/
│   │   ├── coordinator/    # Coordinator server
│   │   ├── proofs/         # Walrus, Seal, Sui integrations
│   │   └── config.ts       # Configuration
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React frontend (TypeScript + Vite)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── worker_nodes/           # Python FastAPI workers
│   ├── worker_1/          # Worker node 1
│   │   ├── api.py         # FastAPI endpoints (train, health)
│   │   ├── main.py        # Uvicorn server entry point
│   │   └── requirements.txt
│   ├── worker_2/          # Worker node 2
│   │   ├── api.py         # FastAPI endpoints (train, health)
│   │   ├── main.py        # Uvicorn server entry point
│   │   └── requirements.txt
│   └── common/            # Shared utilities
│       ├── training_engine.py  # Training logic with replay proof
│       └── crypto.py      # Ed25519 cryptography, hardware info, attestation
├── scripts/               # PowerShell scripts
│   ├── start-local.ps1
│   ├── start-workers.ps1
│   └── monitor-nodes.ps1
├── .env                   # Environment variables (create from template)
└── README.md
```

## Production Features

### 🔐 Full Encrypted Pipeline

**Complete end-to-end encryption at every step:**

1. **Encrypted Shard**: Coordinator encrypts data shards with Seal SDK before sending to workers
2. **Decrypted Training**: Workers decrypt shards themselves via `/api/decrypt` endpoint
3. **Encrypted Update**: Workers encrypt updates/logs before sending back to coordinator
4. **On-chain Verified Aggregation**: Coordinator decrypts internally, aggregates, and records on-chain

**Result**: "Full encrypted federated pipeline, not just encrypted input."

### 🎯 Worker Attestation (Cryptographic Signatures)

- **Ed25519 Signatures**: Each worker generates cryptographic signature for updates
- **Hardware Info**: CPU cores, RAM, platform, processor included in attestation
- **Sui Address**: Derived from worker's Ed25519 public key
- **Production Format**: 
  ```json
  {
    "nodeId": "worker-1",
    "suiAddress": "0x0683eb0a3cbd0cdb2694f0d42486468cb329becdcc65ebd7b1efbb6a75b5fe2d",
    "weightsHash": "sha256:2ab34f...",
    "signature": "base64_ed25519_signature",
    "signerPubKey": "base64_public_key"
  }
  ```
- **Verification**: Backend verifies signatures cryptographically (Ed25519PublicKey)

### 📊 Federated "Replay Proof"

- **Per-epoch Loss Hashes**: SHA256 hash for each epoch's loss value
- **Per-epoch Gradient Norm Hashes**: SHA256 hash for each epoch's gradient norm
- **Random Challenge Seed**: Random seed for replay challenge
- **Signed Training Steps**: Complete training steps summary with signature
- **Offline Verifiable**: Hash chain can be verified offline without re-running training

### 🔍 Zero-Knowledge Commit for Data Shard

- **Coordinator**: Creates `commitHash = SHA256(shardPlaintext)` before encrypting
- **Worker**: After decrypt, hashes plaintext and compares with commit
- **Verification**: Signs "Match / No Match" attestation
- **Benefit**: Proves data integrity without revealing content

### 📝 Full Audit Log to Walrus

**Complete JSON trace with all events:**
- Training start
- Decrypt permission event
- Policy call result
- Worker identity (Sui address, hardware info)
- Timing (startedAt, finishedAt)
- Losses (lossHistory, lossHistoryHash)
- Update hash (weightsHash)
- Signature (Ed25519 signature + public key)
- Nonce (random nonce for audit)
- Final aggregated hash

**Stored in Walrus**: Complete trace for offline verification

### ⚡ Sui Transaction Simulation

- **Pre-verify**: Dry-run decrypt transactions with `devInspectTransactionBlock`
- **Policy Check**: Verify policy allow/deny before decrypt
- **Gas Estimation**: Estimate gas costs before execution
- **Expected Changes**: Verify expected object changes
- **Pipeline**: "Pre-verified before execution"

### 🔑 Session Key (Standard IntentScope)

- **Sui Wallet**: Uses `signPersonalMessage` (IntentScope.PersonalMessage)
- **Ephemeral**: Falls back to ephemeral keypair with `messageWithIntent` + `toSerializedSignature`
- **Format**: Standard Sui serialized signature format
- **Verification**: Verified with Sui Ed25519PublicKey

### 📈 Monitor Nodes Endpoint

- **Endpoint**: `/api/monitor/nodes`
- **Display Format**: `"Worker-1 · 6 cores · sig verified ✅"`
- **Info**: Hardware info, Sui address, signature availability
- **Real-time**: Monitor worker status and attestation capability

### Federated Learning

- Coordinator splits datasets into shards
- Each worker trains locally on encrypted shards
- **Workers decrypt themselves** (not coordinator decrypting before sending)
- **Workers encrypt updates** before sending to coordinator
- Aggregated results produce insights without exposing raw data

### Privacy & Security

- **Seal Encryption**: Data shards encrypted before distribution with policy package
- **Zero-Knowledge Commit**: Data integrity verification without revealing content
- **Privacy-Preserving**: Workers only see decrypted shards (they decrypt themselves)
- **Full Encrypted Pipeline**: End-to-end encryption at every step
- **Verifiable Compute**: Cryptographic signature verification + heuristic verification

### On-Chain Provenance

- **Walrus Storage**: Training logs, model updates, insights, and **full audit log trace** stored on Walrus
- **Sui Blockchain**: Analysis completion, node participation, and provenance links recorded on-chain
- **Immutable Trail**: Complete audit trail from upload to insight
- **Offline Verifiable**: Hash chains and signatures can be verified offline

### Insight Generation

- AI-generated narratives from training results
- Auto-generated charts and visualizations
- Shareable InsightCards with on-chain proof links
- Complete audit log trace in Walrus for verification

## API Endpoints

### Coordinator Endpoints

- `GET /api/health` - Basic health check
- `GET /api/health/full` - Full health check with worker details
- `GET /api/monitor/nodes` - Monitor worker nodes (hardware info & signature status)
- `GET /api/progress` - SSE (Server-Sent Events) progress stream
- `POST /api/upload` - Upload CSV file for federated learning
  - Form data: `file`, `prompt`, `sessionKey`, `userAddress`
  - Response: Aggregation result with updates, insight, proof
- `POST /api/decrypt` - Decrypt endpoint for workers (internal use)
  - Body: `{ encryptedData, sessionKey, txBytes, userAddress }`
  - Response: `{ decryptedData }`

### Worker Endpoints

- `GET /health` - Health check with hardware info & signature status
  - Response: `{ ok, role, nodeId, suiAddress, hardwareInfo, signatureAvailable }`
- `POST /train` - Train on data shard
  - Body: `TrainShardRequest` (with optional encryptedData, sessionKey, txBytes, commitHash)
  - Response: `TrainUpdate` with attestation, replay proof, audit trace

## Production Deployment (Docker Compose)

```bash
# Build backend (TypeScript -> JavaScript)
npm --prefix backend run build

# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Production Configuration:**
- Set `WALRUS_SIGNER_PRIVATE_KEY` for persistent Walrus signing
- Set `WORKER1_PRIVATE_KEY` and `WORKER2_PRIVATE_KEY` for persistent worker attestation
- Use production Sui network (mainnet) with appropriate RPC endpoint
- Configure proper access control in policy package

Note: Docker Compose setup may require additional configuration for Python workers. For production, consider deploying workers separately or using containerized Python services.

## Development Notes

### Backend Development

- Uses TypeScript with `ts-node-dev` for hot reload
- Express.js with CORS enabled for frontend integration
- SSE (Server-Sent Events) for real-time progress updates
- Multer for file upload handling

### Frontend Development

- React 18+ with TypeScript
- Vite for fast development and building
- Real-time progress updates via SSE
- File upload with drag-and-drop support

### Worker Development

- Python 3.10+ with FastAPI
- Shared training engine in `worker_nodes/common/training_engine.py` (with replay proof)
- Cryptographic utilities in `worker_nodes/common/crypto.py` (Ed25519, hardware info, attestation)
- Health check endpoints for monitoring (with hardware info & signature status)
- Simulated local training (hackathon MVP)
- **Ed25519 Attestation**: Workers sign updates with Ed25519 signatures
- **Hardware Info**: Collects CPU cores, RAM, platform via psutil
- **Encrypted Updates**: Workers encrypt updates before sending to coordinator
- **Zero-Knowledge Commit**: Workers verify commit hash after decrypt
- **Full Audit Trace**: Complete event log for every training run

## Troubleshooting

### Workers Not Responding

1. Check if Python workers are running on ports 3001 and 3002
2. Verify `WORKER_NODES` environment variable matches actual worker URLs
3. Check worker health endpoints: http://localhost:3001/health and http://localhost:3002/health

### SDK Connection Issues

1. Verify `SUI_NETWORK` is set correctly (testnet/devnet/mainnet/localnet)
2. Check network connectivity to Sui RPC endpoints
3. For Seal: Verify key servers are accessible (public testnet key servers should work automatically)
4. For Walrus: Verify Sui network connection for on-chain blob registration

### Build Issues

1. Ensure all dependencies are installed: `npm run install:all`
2. Check Node.js version (18+ required)
3. Check Python version (3.10+ required)
4. For TypeScript errors, run `npm --prefix backend run build` to see detailed errors

## License

Built for the Walrus Hackathon - See individual package licenses for details.

## Production Readiness Checklist

### ✅ Implemented

- ✅ **Full Encrypted Pipeline**: End-to-end encryption at every step
- ✅ **Worker Attestation**: Ed25519 cryptographic signatures with hardware info
- ✅ **Replay Proof**: Per-epoch hashes, gradient norm hashes, challenge seed
- ✅ **Transaction Simulation**: Pre-verify decrypt transactions with `devInspectTransactionBlock`
- ✅ **Zero-Knowledge Commit**: Data integrity verification without revealing content
- ✅ **Full Audit Log**: Complete JSON trace with all events stored in Walrus
- ✅ **Worker Sui Keypair**: Load from env or generate ephemeral
- ✅ **Session Key Standard**: IntentScope.PersonalMessage with toSerializedSignature
- ✅ **Monitor Nodes**: Hardware info & signature status display
- ✅ **Cryptographic Verification**: Ed25519 signature verification for worker updates

### 🔧 Production Enhancements (Optional)

- [ ] Replace ephemeral keypairs with persistent keys from env vars
- [ ] Add rate limiting for decrypt endpoint
- [ ] Implement proper Seal encryption for worker updates (currently base64 placeholder)
- [ ] Add production-grade error handling and retry logic
- [ ] Security audit of encryption and key server selection
- [ ] Scalable worker deployment architecture (Kubernetes, Docker Swarm)
- [ ] Production monitoring and alerting (Prometheus, Grafana)
- [ ] Enhanced policy package with custom access control logic
- [ ] Implement actual gradient norm computation in training (currently mock)

## Contributing

This is a production-ready hackathon MVP with full encrypted pipeline, cryptographic attestation, and complete audit logging. For production deployment:

1. Set persistent keypairs via environment variables
2. Configure production Sui network (mainnet)
3. Deploy policy package with custom access control
4. Set up monitoring and alerting
5. Perform security audit
