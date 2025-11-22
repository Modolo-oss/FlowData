# FlowData Studio

**AI-Powered Data Analysis Platform** with on-chain provenance and real-time insights. Transform your files (CSV, JSON, images, PDF, Word) into beautiful visualizations, AI-generated stories, and shareable insight cards with cryptographic verification.

Built for the **Walrus Hackathon** using Sui, Walrus, and Seal SDKs.

## 🎯 What is FlowData Studio?

FlowData Studio is an **AI-powered data analysis platform** that:

1. **Accepts Any File Format**: Upload CSV, JSON, images, PDF, Word documents, or plain text
2. **Intelligently Analyzes**: Automatically detects and parses any data structure
3. **Generates AI Insights**: Uses OpenRouter LLM to create natural language stories from your data
4. **Creates AI-Generated Charts**: LLM intelligently generates relevant chart visualizations based on your actual data structure
5. **Stores on Walrus**: Uploads original files to Walrus (up to ~14 GB per file)
6. **Proves on Blockchain**: Records provenance on Sui blockchain
7. **Shares Insights**: Generate shareable insight cards with on-chain proof links

## 🏗️ Architecture

### System Overview

```
┌─────────────┐
│   Frontend  │  Next.js + React + TypeScript
│  (Port 3000)│  └─ Sui Wallet Integration
│             │  └─ Real-time Progress (SSE)
│             │  └─ AI Story & Charts Display
│             │  └─ Session Storage
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Backend    │  Express.js + TypeScript
│ (Port 3002) │  └─ File Upload & Processing
│             │  └─ Multi-format Analyzers
│             │  └─ Walrus SDK (Storage)
│             │  └─ Sui SDK (On-chain)
│             │  └─ OpenRouter LLM (Insights + Charts)
│             │  └─ Chart Generator (LLM-based, no hardcoded logic)
└─────────────┘
```

### Technology Stack

**Frontend** (Next.js 16 + React 19 + TypeScript):
- **Next.js** - React framework with SSR
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Recharts** - Data visualization
- **Sui Wallet** - Session key generation
- **SSE** - Real-time progress updates

**Backend** (Express.js + TypeScript):
- **Express.js** - REST API server
- **Multer** - File upload handling
- **Walrus SDK** (`@mysten/walrus`) - Decentralized blob storage (up to ~14 GB)
- **Sui SDK** (`@mysten/sui`) - On-chain provenance
- **OpenRouter** - LLM API for AI insights
- **Multi-format Analyzers**:
  - CSV Analyzer (statistics, correlations, trends, clusters)
  - JSON Analyzer (handles any JSON structure)
  - Image Analyzer (metadata extraction)
  - PDF Analyzer (text extraction)
  - Word Analyzer (text extraction)
  - Text Analyzer (plain text)

**Blockchain & Storage**:
- **Sui** - On-chain provenance and transaction recording
- **Walrus** - Decentralized blob storage for files (binary storage)

## 🔄 Complete Data Flow

### 1. File Upload

```
User Upload File (any format)
    ↓
Backend:
  - Validates file
  - Detects file type (CSV, JSON, image, PDF, Word, text)
  - Uploads file to Walrus (binary blob, ONCE)
```

### 2. Data Analysis

```
Backend:
  - Analyzes file based on type:
    * CSV: Statistics, correlations, trends, clusters, outliers
    * JSON: Flattens nested structures, extracts all keys
    * Images: Extracts metadata (width, height, format)
    * PDF/Word: Extracts text, counts words/chars/lines
  - Generates charts dynamically from actual data
```

### 3. AI Insight & Chart Generation

```
Backend:
  - Sends analysis results to OpenRouter LLM:
    * Data statistics
    * Correlations found
    * Trends detected
    * Structure detected
  - LLM intelligently generates:
    * Natural language story
    * Key findings
    * Recommendations
    * Chart specifications (JSON format):
      - Trends (if time-series data)
      - Bar charts (if key-value or categorical)
      - Scatter plots (if 2+ numeric columns)
      - Pie charts (if distribution data)
      - Line charts (if sequential data)
      - Correlations (if numeric correlations)
  - Backend parses LLM chart specs and converts to frontend format
```

### 4. On-Chain Provenance

```
Backend:
  - Stores file to Walrus (binary blob, ~14 GB max)
  - Records on Sui:
    * Walrus blob ID
    * File hash
    * Analysis metadata
    * Transaction hash
```

### 5. Frontend Display

```
Frontend:
  - Real-time progress (SSE)
  - AI-generated story
  - Dynamic charts from actual data:
    * Correlation matrix (if applicable)
    * Trend analysis (if time-series)
    * Cluster visualization (if applicable)
    * Key-value bar chart (if key-value structure)
  - Summary statistics
  - On-chain proof links:
    * Walrus Scan URL
    * Sui Explorer link
  - Regenerate insights with new prompts
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (for backend and frontend)
- **npm** or **yarn** (package manager)
- **Git** (for cloning)

### Installation

```bash
# Clone repository
git clone https://github.com/Modolo-oss/FlowData.git
cd FlowData

# Install dependencies
npm run install:all
```

### Environment Variables

Create `.env` file in project root:

```env
# Backend
COORDINATOR_PORT=3002
MAX_UPLOAD_MB=200

# Sui Network
SUI_NETWORK=testnet
SUI_RPC_URL=https://sui-testnet-rpc.publicnode.com

# Walrus Signer (optional - for production)
WALRUS_SIGNER_PRIVATE_KEY=

# OpenRouter LLM (for AI insights)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini,google/gemma-3-27b-it:free,nvidia/nemotron-nano-12b-v2-vl:free
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Running Locally

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3002

**API Endpoints**:
- `GET /api/health` - Health check
- `GET /api/progress` - SSE progress stream
- `POST /api/upload` - Upload file (any format)
- `POST /api/regenerate-insights` - Regenerate AI insights with new prompt

## 📊 Supported File Types

### CSV (Comma-Separated Values)
- Extracts columns (numeric & categorical)
- Calculates statistics (mean, min, max, median, std)
- Finds correlations between columns
- Detects trends (time-series analysis)
- Identifies clusters and outliers

### JSON
- Handles any JSON structure (arrays, objects, nested)
- Flattens nested objects recursively
- Extracts all keys as columns
- Converts array of objects to table format

### Images
- Extracts metadata (width, height, format, size)
- Generates basic insights

### PDF
- Extracts text content
- Counts words, characters, lines
- Generates text-based insights

### Word Documents
- Extracts text from .doc and .docx files
- Counts words, characters, lines
- Generates text-based insights

### Plain Text
- Analyzes text content
- Counts words, characters, lines
- Detects if it's CSV or JSON and parses accordingly

## 🤖 Features

### 🔍 Flexible Data Analysis

- **Any File Format**: CSV, JSON, images, PDF, Word, text
- **Intelligent Parsing**: Automatically detects and adapts to data structure
- **Dynamic Charts**: Generates relevant visualizations based on actual data
- **No Format Requirements**: User can upload anything, system adapts

### 🤖 AI-Powered Insights

- **Natural Language Stories**: LLM-generated narratives from your data
- **Key Findings**: Bullet points of important insights
- **Recommendations**: Actionable recommendations based on data
- **Regenerate Insights**: Generate new insights with different prompts without re-uploading

### 📈 AI-Generated Dynamic Visualizations

- **LLM-Powered Chart Generation**: No hardcoded logic - LLM decides what charts are relevant
- **Intelligent Chart Detection**: LLM analyzes data structure and generates appropriate visualizations:
  - Trend charts (if time-series data detected)
  - Bar charts (if key-value or categorical data)
  - Scatter plots (if 2+ numeric columns with relationships)
  - Pie charts (if distribution data)
  - Line charts (if sequential patterns)
  - Correlation matrices (if numeric correlations exist)
- **Adaptive**: Only generates and shows charts that make sense for your data
- **No Hardcoded Logic**: Fully intelligent chart generation based on actual data structure

### 🔐 Privacy & Security

- **On-Chain Provenance**: All files recorded on Sui blockchain
- **Walrus Storage**: Files stored on decentralized storage
- **File Hash Verification**: SHA256 hash for integrity

### ⛓️ On-Chain Provenance

- **Walrus Storage**: Original files stored on Walrus (up to ~14 GB)
- **Sui Blockchain**: Provenance links recorded on-chain
- **Verifiable**: Hash chains for verification
- **Shareable**: Insight cards with on-chain proof links

## 📁 Project Structure

```
.
├── backend/                    # Express.js backend (TypeScript)
│   ├── src/
│   │   ├── coordinator/       # API server
│   │   │   └── server.ts      # Main API server
│   │   ├── proofs/            # Blockchain integrations
│   │   │   ├── walrus.ts      # Walrus SDK (storage)
│   │   │   └── sui.ts         # Sui SDK (on-chain)
│   │   ├── services/          # External services
│   │   │   └── llm-new.ts     # OpenRouter LLM integration
│   │   ├── utils/             # Utilities
│   │   │   ├── fileAnalyzer.ts    # Universal file analyzer
│   │   │   ├── fileTypeDetector.ts # File type detection
│   │   │   ├── csvAnalyzer.ts     # CSV analysis
│   │   │   ├── jsonAnalyzer.ts    # JSON analysis
│   │   │   ├── imageAnalyzer.ts   # Image analysis
│   │   │   ├── pdfAnalyzer.ts     # PDF analysis
│   │   │   ├── wordAnalyzer.ts    # Word analysis
│   │   │   └── chartGenerator.ts  # Chart generation
│   │   ├── config.ts          # Configuration
│   │   └── types.ts           # TypeScript types
│   └── package.json
│
├── frontend/                   # Next.js frontend (React + TypeScript)
│   ├── app/                    # Next.js app directory
│   │   ├── page.tsx           # Home page
│   │   ├── upload/            # Upload page
│   │   ├── progress/          # Progress page
│   │   └── analysis/          # Analysis results page
│   ├── components/             # React components
│   │   ├── ai-story.tsx       # AI story component
│   │   ├── charts-grid.tsx    # Charts visualization
│   │   ├── insight-card.tsx    # Shareable insight card
│   │   └── prompt-input.tsx    # Prompt input for regenerate
│   ├── hooks/                 # React hooks
│   │   ├── use-progress.ts    # SSE progress hook
│   │   └── use-sui-wallet.ts  # Sui wallet hook
│   ├── lib/                   # Utilities
│   │   ├── api.ts             # API client
│   │   └── sessionKey.ts      # Session key generation
│   └── package.json
│
├── docs/                      # Documentation
│   ├── REGENERATE_INSIGHTS_API.md
│   └── SUPPORTED_FILE_TYPES.md
│
└── README.md
```

## 🔧 Configuration

### Ports

- **Frontend**: `3000` (Next.js default)
- **Backend**: `3002` (configurable via `COORDINATOR_PORT`)

### Environment Variables

**Backend (`.env` in root)**:
- `COORDINATOR_PORT` - Backend port (default: 3002)
- `MAX_UPLOAD_MB` - Maximum upload size in MB (default: 200)
- `SUI_NETWORK` - Sui network (testnet/mainnet/devnet)
- `SUI_RPC_URL` - Custom Sui RPC endpoint
- `WALRUS_SIGNER_PRIVATE_KEY` - Walrus signer key (optional, for production)
- `OPENROUTER_API_KEY` - OpenRouter API key (required for AI insights)
- `OPENROUTER_MODEL` - Comma-separated list of LLM models (with fallback)

**Frontend (`frontend/.env.local`)**:
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3002)

## 🎨 User Experience

### 1. Upload File

- Drag & drop file or click to upload
- Supports: CSV, JSON, images, PDF, Word, text
- Optional: Connect Sui Wallet for session key generation
- Optional: Add custom prompt for personalized analysis

### 2. Real-Time Progress

- Watch progress in real-time via SSE
- See analysis stages:
  - Validating file
  - Detecting file type
  - Analyzing data
  - Generating AI insights and charts (LLM-powered)
  - Uploading to Walrus
  - Recording on Sui

### 3. View Insights

- **AI Data Story**: Natural language narrative from your data
- **Key Findings**: Important insights as bullet points
- **Recommendations**: Actionable recommendations
- **AI-Generated Charts**: 
  - LLM intelligently decides which charts to generate
  - Charts generated based on actual data structure (not hardcoded)
  - Only relevant visualizations are shown
- **Summary Statistics**: Total samples, columns, correlations, outliers

### 4. Regenerate Insights

- Enter new prompt without re-uploading file
- Analysis results stored in sessionStorage
- Generate new AI insights based on same data
- View updated insights and charts

### 5. Share Results

- **Insight Card**: Shareable card with story + charts + on-chain proof
- **Walrus Scan**: View file on Walrus
- **Sui Explorer**: View on-chain transaction

## 📚 API Documentation

### Endpoints

**File Upload**:
- `POST /api/upload` - Upload file (any format)
  - Form data: `file`, `prompt` (optional), `userAddress` (optional)
  - Response: `AnalysisResult` with insights, charts, blobId, suiTx

**Progress**:
- `GET /api/progress` - SSE progress stream (real-time updates)

**Regenerate Insights**:
- `POST /api/regenerate-insights` - Regenerate AI insights with new prompt
  - Body: `blobId`, `prompt`, `sessionKey` (optional)
  - Response: Updated `llmInsights` and `chartData`

**Health**:
- `GET /api/health` - Health check

## 🧪 Testing

### Test with Sample Data

1. Start backend and frontend
2. Open http://localhost:3000
3. Upload a file (CSV, JSON, image, PDF, Word, or text)
4. Watch real-time progress
5. View AI-generated insights and charts
6. Try regenerating insights with a new prompt

## 🐛 Troubleshooting

### No Data Insights

- Ensure file has data
- Check file format is supported
- Verify file is not empty

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

1. Set persistent keypair via `WALRUS_SIGNER_PRIVATE_KEY`
2. Configure production Sui network (mainnet)
3. Set up monitoring and alerting
4. Perform security audit

## 🔗 Links

- **Repository**: https://github.com/Modolo-oss/FlowData
- **Sui Explorer**: https://suiexplorer.com
- **Walrus Scan**: https://scan.walrus.space
- **OpenRouter**: https://openrouter.ai

---

**Built with ❤️ for the Walrus Hackathon**
