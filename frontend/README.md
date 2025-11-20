# FlowData Studio Frontend

Modern Next.js frontend for FlowData Studio - A decentralized federated learning platform.

## Features

- 📤 **File Upload** - Upload CSV files with drag-and-drop
- 🔐 **Encryption** - Optional Sui Wallet integration for encrypted federated learning
- 📊 **Real-time Progress** - SSE-based progress tracking
- 📈 **AI Data Story** - Natural language insights from your data
- 📉 **Auto-generated Charts** - Correlation matrix, trends, clusters, and more
- 🎯 **InsightCard** - Shareable cards with on-chain proof
- 🔍 **Monitor Nodes** - Real-time worker node status

## Setup

1. **Install dependencies:**
```bash
pnpm install
```

2. **Create `.env.local` file:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. **Run development server:**
```bash
pnpm dev
```

4. **Build for production:**
```bash
pnpm build
pnpm start
```

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend coordinator API URL (default: `http://localhost:3000`)

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Recharts** - Data visualization
- **Sonner** - Toast notifications
- **Sui Wallet** - Blockchain integration

## Project Structure

```
frontend/
├── app/              # Next.js App Router pages
│   ├── upload/       # File upload page
│   ├── progress/     # Training progress page
│   ├── analysis/     # Results/insights page
│   └── nodes/        # Worker nodes monitor
├── components/       # React components
│   ├── ai-story.tsx      # AI-generated narrative
│   ├── charts-grid.tsx   # Chart visualizations
│   ├── insight-card.tsx  # Shareable insight card
│   └── prompt-input.tsx  # Personalized analysis prompt
├── lib/              # Utilities
│   ├── api.ts        # Backend API client
│   └── sessionKey.ts # Session key generation
└── hooks/            # React hooks
    ├── use-progress.ts    # SSE progress tracking
    └── use-sui-wallet.ts  # Sui Wallet integration
```

## API Integration

The frontend communicates with the backend coordinator via:

- `POST /api/upload` - Upload CSV file for training
- `GET /api/progress` - SSE stream for real-time progress
- `GET /api/monitor/nodes` - Get worker nodes status
- `GET /api/health/full` - Health check

## Usage

1. **Upload Data:**
   - Navigate to `/upload`
   - Select or drag-and-drop a CSV file
   - Optionally connect Sui Wallet for encryption
   - Enter a prompt for personalized analysis
   - Click "Start Analysis"

2. **Monitor Progress:**
   - Automatically redirected to `/progress`
   - Real-time updates via SSE
   - View worker status and training metrics

3. **View Results:**
   - Automatically redirected to `/analysis` when complete
   - View AI-generated story
   - Explore charts and visualizations
   - Share InsightCard with on-chain proof

4. **Monitor Nodes:**
   - Navigate to `/nodes`
   - View worker node status, hardware info, and signatures
   - Auto-refreshes every 10 seconds

## Development

```bash
# Run dev server
pnpm dev

# Type check
pnpm type-check

# Lint
pnpm lint

# Build
pnpm build
```

## Notes

- Ensure backend coordinator is running on `NEXT_PUBLIC_API_URL`
- Sui Wallet extension is optional but recommended for encryption
- All data is processed through encrypted federated learning pipeline

