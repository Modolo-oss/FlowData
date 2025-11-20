# FlowData Studio

**AI-Powered Federated Data Analysis Platform** with on-chain provenance, privacy-preserving encryption, and real-time insights. Transform your CSV data into beautiful visualizations, AI-generated stories, and shareable insight cards with cryptographic verification.

Built for the **Walrus Hackathon** using Sui, Walrus, and Seal SDKs.

## 🎯 What is FlowData Studio?

FlowData Studio is a **decentralized federated learning platform** that:

1. **Analyzes Your Data**: Upload CSV files and get real-time analysis across distributed worker nodes
2. **Generates AI Insights**: Uses OpenRouter LLM to create natural language stories from your data
3. **Creates Beautiful Charts**: Auto-generates correlation matrices, trend forecasts, and cluster visualizations from **actual data** (not mock)
4. **Preserves Privacy**: Encrypts data shards with Seal SDK before distribution
5. **Proves on Blockchain**: Stores complete audit logs on Walrus and records provenance on Sui
6. **Shares Insights**: Generate shareable InsightCards with on-chain proof links

## 🏗️ Architecture

### System Overview

```
┌─────────────┐
│   Frontend  │  Next.js + React + TypeScript
│  (Port 3000)│  └─ Sui Wallet Integration
│             │  └─ Real-time Progress (SSE)
│             │  └─ AI Story & Charts Display
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Coordinator │  Express.js + TypeScript
│ (Port 3002) │  └─ File Upload & Processing
│             │  └─ Seal SDK (Encryption)
│             │  └─ Walrus SDK (Storage)
│             │  └─ Sui SDK (On-chain)
│             │  └─ OpenRouter LLM (Insights)
│             │  └─ Chart Generator
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Worker 1 │   │ Worker 2 │   │  ...     │
│(Port 8001)│  │(Port 8002)│  │          │
│          │   │          │   │          │
│ Python   │   │ Python   │   │ Python   │
│ FastAPI  │   │ FastAPI  │   │ FastAPI  │
│          │   │          │   │          │
│ └─ Data  │   │ └─ Data  │   │ └─ Data  │
│    Analyzer│ │    Analyzer│ │    Analyzer│
│ └─ Training│ │ └─ Training│ │ └─ Training│
│ └─ Crypto │ │ └─ Crypto │ │ └─ Crypto │
└──────────┘   └──────────┘   └──────────┘
```

### Technology Stack

**Frontend** (Next.js 16 + React 19 + TypeScript):
- **Next.js** - React framework with SSR
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Recharts** - Data visualization
- **Sui Wallet** - Session key generation
- **SSE** - Real-time progress updates

**Backend Coordinator** (Express.js + TypeScript):
- **Express.js** - REST API server
- **Seal SDK** (`@mysten/seal`) - Privacy-preserving encryption
- **Walrus SDK** (`@mysten/walrus`) - Decentralized blob storage
- **Sui SDK** (`@mysten/sui`) - On-chain provenance
- **OpenRouter** - LLM API for AI insights
- **Chart Generator** - Aggregate and generate charts from actual data

**Workers** (Python FastAPI):
- **FastAPI** - REST API for workers
- **Data Analyzer** - CSV analysis (statistics, correlations, clusters, trends)
- **Training Engine** - Federated learning with replay proof
- **Cryptography** - Ed25519 signatures, hardware info, attestation
- **psutil** - Hardware information

**Blockchain & Storage**:
- **Sui** - On-chain provenance and transaction simulation
- **Walrus** - Decentralized blob storage for audit logs
- **Seal** - Privacy-preserving encryption with key servers

## 🔄 Complete Data Flow

### 1. User Upload & Processing

```
User Upload CSV
    ↓
Coordinator:
  - Validates file
  - Splits into shards
  - Generates commit hash (SHA256)
  - Encrypts shards with Seal SDK
    ↓
Workers:
  - Receive encrypted shards
  - Decrypt via /api/decrypt endpoint
  - Verify commit hash (zero-knowledge)
```

### 2. Data Analysis & Training

```
Workers:
  - Analyze CSV data:
    * Statistics (mean, median, std, min, max)
    * Correlations (Pearson correlation)
    * Clusters (k-means-like clustering)
    * Trends (time series analysis)
    * Outliers (2+ std deviations)
  - Train federated model:
    * Loss history
    * Replay proof (per-epoch hashes)
    * Cryptographic attestation
    ↓
Coordinator:
  - Receives data insights + training results
  - Aggregates insights from all workers
  - Generates charts from actual data
```

### 3. AI Insight Generation

```
Coordinator:
  - Sends aggregated data to OpenRouter LLM:
    * Actual data statistics
    * Correlations found
    * Trends detected
    * Clusters identified
    * Training metrics
  - LLM generates:
    * Natural language story
    * Key findings
    * Recommendations
    * Chart explanations
```

### 4. On-Chain Provenance

```
Coordinator:
  - Stores to Walrus:
    * Full audit log trace
    * Data insights
    * Training results
    * AI-generated insights
  - Records on Sui:
    * Walrus CID
    * Blob Object ID
    * Transaction hash
    * Participant nodes
```

### 5. Frontend Display

```
Frontend:
  - Real-time progress (SSE)
  - AI-generated story
  - Charts from actual data:
    * Correlation matrix
    * Trend analysis
    * Cluster visualization
  - Summary statistics
  - On-chain proof links:
    * Walrus Scan URL
    * Sui Explorer link
  - Shareable InsightCard
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (for backend and frontend)
- **Python** 3.10+ (for workers)
- **npm** or **yarn** (package manager)
- **Git** (for cloning)

### Installation

```bash
# Clone repository
git clone https://github.com/Modolo-oss/FlowData.git
cd FlowData

# Install backend and frontend dependencies
npm run install:all

# Install Python dependencies for workers
pip install -r worker_nodes/worker_1/requirements.txt
pip install -r worker_nodes/worker_2/requirements.txt
```

### Environment Variables

Create `.env` file in project root:

```env
# Coordinator (Backend)
COORDINATOR_PORT=3002
WORKER_NODES=http://localhost:8001,http://localhost:8002
MAX_UPLOAD_MB=200

# Sui Network
SUI_NETWORK=testnet
SUI_RPC_URL=https://sui-testnet-rpc.publicnode.com

# Seal Policy Package (pre-deployed)
SEAL_POLICY_PACKAGE_ID=0x1c2dd5cfaecda72a2d1fbeb48032be68667d760a4f56fa93848a004701d700f8

# Walrus Signer (optional - for production)
WALRUS_SIGNER_PRIVATE_KEY=

# Worker Private Keys (optional - for production)
WORKER1_PRIVATE_KEY=
WORKER2_PRIVATE_KEY=

# OpenRouter LLM (for AI insights)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini,google/gemma-3-27b-it:free,z-ai/glm-4.5-air:free
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Running Locally

**Option 1: PowerShell Script (Windows)**

```powershell
# Start all services
.\scripts\start-local.ps1
```

**Option 2: Manual Start**

```bash
# Terminal 1: Coordinator
cd backend
npm run dev:coordinator

# Terminal 2: Worker 1
cd worker_nodes/worker_1
python -m uvicorn api:app --port 8001

# Terminal 3: Worker 2
cd worker_nodes/worker_2
python -m uvicorn api:app --port 8002

# Terminal 4: Frontend
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Coordinator API**: http://localhost:3002
- **Worker 1**: http://localhost:8001
- **Worker 2**: http://localhost:8002

**API Endpoints**:
- `GET /api/health` - Health check
- `GET /api/monitor/nodes` - Monitor worker nodes
- `GET /api/progress` - SSE progress stream
- `GET /api/walrus/:blobId` - Retrieve data from Walrus
- `POST /api/upload` - Upload CSV file

## 📊 Features

### 🔍 Real Data Analysis

- **Statistics**: Mean, median, std, min, max for numeric columns
- **Correlations**: Pearson correlation matrix between numeric columns
- **Clusters**: K-means-like clustering visualization
- **Trends**: Time series analysis with direction detection
- **Outliers**: Automatic outlier detection (2+ std deviations)

### 🤖 AI-Powered Insights

- **Natural Language Stories**: LLM-generated narratives from your data
- **Key Findings**: Bullet points of important insights
- **Recommendations**: Actionable recommendations based on data
- **Chart Explanations**: LLM explains what charts mean

### 📈 Beautiful Visualizations

- **Correlation Matrix**: Interactive correlation visualization
- **Trend Forecast**: Time series with trend direction
- **Cluster Visualization**: 2D scatter plot with clusters
- **Summary Statistics**: Key metrics at a glance

### 🔐 Privacy & Security

- **Seal Encryption**: Data shards encrypted before distribution
- **Zero-Knowledge Commit**: Data integrity verification
- **Worker Attestation**: Ed25519 cryptographic signatures
- **Full Encrypted Pipeline**: End-to-end encryption

### ⛓️ On-Chain Provenance

- **Walrus Storage**: Complete audit logs stored on Walrus
- **Sui Blockchain**: Provenance links recorded on-chain
- **Verifiable**: Hash chains and signatures for offline verification
- **Shareable**: InsightCards with on-chain proof links

## 📁 Project Structure

```
.
├── backend/                    # Express.js backend (TypeScript)
│   ├── src/
│   │   ├── coordinator/       # Coordinator server
│   │   │   └── server.ts      # Main API server
│   │   ├── proofs/            # Blockchain integrations
│   │   │   ├── seal.ts        # Seal SDK (encryption)
│   │   │   ├── walrus.ts      # Walrus SDK (storage)
│   │   │   └── sui.ts         # Sui SDK (on-chain)
│   │   ├── services/          # External services
│   │   │   └── llm.ts         # OpenRouter LLM integration
│   │   ├── utils/             # Utilities
│   │   │   └── chartGenerator.ts  # Chart generation from data
│   │   ├── config.ts          # Configuration
│   │   └── types.ts           # TypeScript types
│   └── package.json
│
├── frontend/                   # Next.js frontend (React + TypeScript)
│   ├── app/                    # Next.js app directory
│   │   ├── page.tsx           # Home page
│   │   ├── upload/            # Upload page
│   │   ├── progress/           # Progress page
│   │   ├── analysis/          # Analysis results page
│   │   └── nodes/             # Worker nodes monitor
│   ├── components/             # React components
│   │   ├── ai-story.tsx       # AI story component
│   │   ├── charts-grid.tsx    # Charts visualization
│   │   ├── insight-card.tsx    # Shareable insight card
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                 # React hooks
│   │   ├── use-progress.ts    # SSE progress hook
│   │   └── use-sui-wallet.ts  # Sui wallet hook
│   ├── lib/                   # Utilities
│   │   ├── api.ts             # API client
│   │   └── sessionKey.ts      # Session key generation
│   └── package.json
│
├── worker_nodes/              # Python FastAPI workers
│   ├── worker_1/             # Worker node 1
│   │   ├── api.py            # FastAPI endpoints
│   │   ├── main.py           # Server entry point
│   │   └── requirements.txt
│   ├── worker_2/             # Worker node 2
│   │   ├── api.py
│   │   ├── main.py
│   │   └── requirements.txt
│   └── common/               # Shared utilities
│       ├── data_analyzer.py  # CSV data analysis
│       ├── training_engine.py # Federated learning
│       └── crypto.py         # Cryptography & attestation
│
├── flowdata-policy/          # Seal Policy Package (Move)
│   ├── sources/
│   │   └── policy.move       # Policy contract
│   └── Move.toml
│
├── scripts/                  # PowerShell scripts
│   ├── start-local.ps1      # Start all services
│   ├── start-workers.ps1    # Start workers only
│   └── monitor-nodes.ps1    # Monitor nodes
│
├── docs/                    # Documentation
│   └── LLM_ARCHITECTURE.md  # LLM integration docs
│
└── README.md
```

## 🔧 Configuration

### Ports

- **Frontend**: `3000` (Next.js default)
- **Coordinator**: `3002` (configurable via `COORDINATOR_PORT`)
- **Worker 1**: `8001` (configurable via `WORKER1_PORT`)
- **Worker 2**: `8002` (configurable via `WORKER2_PORT`)

### Environment Variables

**Backend (`.env` in root)**:
- `COORDINATOR_PORT` - Coordinator port (default: 3002)
- `WORKER_NODES` - Comma-separated worker URLs
- `SUI_NETWORK` - Sui network (testnet/mainnet/devnet)
- `SUI_RPC_URL` - Custom Sui RPC endpoint
- `SEAL_POLICY_PACKAGE_ID` - Seal policy package ID
- `WALRUS_SIGNER_PRIVATE_KEY` - Walrus signer key (optional)
- `WORKER1_PRIVATE_KEY` - Worker 1 key (optional)
- `WORKER2_PRIVATE_KEY` - Worker 2 key (optional)
- `OPENROUTER_API_KEY` - OpenRouter API key (required for AI insights)
- `OPENROUTER_MODEL` - Comma-separated list of LLM models (with fallback)

**Frontend (`frontend/.env.local`)**:
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3002)

## 🎨 User Experience

### 1. Upload Data

- Drag & drop CSV file or click to upload
- Optional: Connect Sui Wallet for session key generation
- Optional: Add custom prompt for personalized analysis

### 2. Real-Time Progress

- Watch progress in real-time via SSE
- See data analysis stages:
  - Validating file
  - Splitting data
  - Encrypting shards
  - Dispatching to workers
  - Training & analyzing
  - Aggregating insights
  - Generating AI insights
  - Storing to Walrus
  - Recording on-chain

### 3. View Insights

- **AI Data Story**: Natural language narrative from your data
- **Key Findings**: Important insights as bullet points
- **Recommendations**: Actionable recommendations
- **Charts**: 
  - Correlation matrix (from actual data)
  - Trend analysis (from time series)
  - Cluster visualization (from data points)
- **Summary Statistics**: Total samples, numeric columns, correlations, outliers

### 4. Share Results

- **InsightCard**: Shareable card with story + charts + on-chain proof
- **Walrus Scan**: View complete audit log on Walrus
- **Sui Explorer**: View on-chain transaction

## 🔐 Security Features

### Full Encrypted Pipeline

1. **Encrypted Shard**: Coordinator encrypts data with Seal SDK
2. **Decrypted Training**: Workers decrypt themselves via `/api/decrypt`
3. **Encrypted Update**: Workers encrypt updates before sending
4. **On-chain Verified**: Complete audit log stored on Walrus

### Cryptographic Attestation

- **Ed25519 Signatures**: Each worker signs updates cryptographically
- **Hardware Info**: CPU cores, RAM, platform included in attestation
- **Sui Address**: Derived from worker's Ed25519 public key
- **Verification**: Backend verifies signatures cryptographically

### Zero-Knowledge Commit

- Coordinator generates `commitHash = SHA256(shardPlaintext)` before encryption
- Worker verifies commit hash after decryption
- Proves data integrity without revealing content

### Replay Proof

- Per-epoch loss hashes
- Per-epoch gradient norm hashes
- Random challenge seed
- Offline verifiable hash chain

## 📚 API Documentation

### Coordinator Endpoints

**Health & Monitoring**:
- `GET /api/health` - Basic health check
- `GET /api/health/full` - Full health with worker details
- `GET /api/monitor/nodes` - Monitor worker nodes (hardware & signature status)

**Data Processing**:
- `POST /api/upload` - Upload CSV file
  - Form data: `file`, `prompt` (optional), `sessionKey` (optional), `userAddress` (optional)
  - Response: `AggregationResult` with insights, charts, proof
- `GET /api/progress` - SSE progress stream (real-time updates)
- `GET /api/walrus/:blobId` - Retrieve data from Walrus

**Internal**:
- `POST /api/decrypt` - Decrypt endpoint for workers (internal use)

### Worker Endpoints

- `GET /health` - Health check with hardware info & signature status
- `POST /train` - Train on data shard
  - Body: `TrainShardRequest` (with optional `encryptedData`, `sessionKey`, `txBytes`, `commitHash`)
  - Response: `TrainUpdate` with `dataInsights`, `attestation`, `replayProof`, `auditTrace`

## 🧪 Testing

### Test with Sample Data

1. Start all services
2. Open http://localhost:3000
3. Upload a CSV file (e.g., `test-sample.csv`)
4. Watch real-time progress
5. View AI-generated insights and charts

### Sample CSV Format

```csv
category,route,successful_txs,failed_txs,success_rate,avg_confirmation_time_sec,avg_cost_sol,time,total_transactions,successful,failed,cost_type,amount_sol
Route Performance,RPC A,2847,123,95.86%,1.2,0.0012,,,,,,
Route Performance,Jito,3521,45,98.74%,0.8,0.0045,,,,,,
Time Series,,,,96.00%,,,00:00,450,432,18,,
Time Series,,,,96.05%,,,04:00,380,365,15,,
```

## 🐛 Troubleshooting

### Workers Not Responding

- Check if workers are running on ports 8001 and 8002
- Verify `WORKER_NODES` environment variable
- Check worker health: http://localhost:8001/health

### No Data Insights

- Ensure CSV has numeric columns
- Check for empty cells (data analyzer handles them)
- Verify workers are analyzing data correctly

### LLM Not Working

- Check `OPENROUTER_API_KEY` is set
- Verify API key is valid
- Check model names in `OPENROUTER_MODEL`

### Walrus Upload Fails

- Verify `WALRUS_SIGNER_PRIVATE_KEY` is set (for production)
- Check Sui network connectivity
- Ensure wallet has sufficient WAL tokens (for testnet)

## 📝 License

Built for the **Walrus Hackathon**. See individual package licenses for details.

## 🤝 Contributing

This is a production-ready hackathon MVP. For production deployment:

1. Set persistent keypairs via environment variables
2. Configure production Sui network (mainnet)
3. Deploy policy package with custom access control
4. Set up monitoring and alerting
5. Perform security audit

## 🔗 Links

- **Repository**: https://github.com/Modolo-oss/FlowData
- **Sui Explorer**: https://suiexplorer.com
- **Walrus Scan**: https://scan.walrus.space
- **OpenRouter**: https://openrouter.ai

---

**Built with ❤️ for the Walrus Hackathon**
