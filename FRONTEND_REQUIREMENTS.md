# FlowData Studio - Frontend Requirements Brief

## Overview

FlowData Studio is a production-ready decentralized federated learning platform frontend. The **core essence** is to transform raw data into **AI-powered insights** with beautiful visualizations and shareable stories.

**Primary Goal**: Users upload CSV data → Get AI-generated data stories + auto-generated charts + shareable InsightCard with on-chain proof.

**Target Users**: Data scientists, ML engineers, researchers, and business analysts who want to quickly understand their data through AI-powered narratives and visualizations.

## Core User Experience (The Essence)

### 📖 AI Data Story
**What users see:**
- Natural language narrative generated from the data
- Example: *"Your dataset shows 14% growth in Q3, with anomalies in row 257. Three clusters emerge: A (high spenders), B (regular users), C (dormant)."*
- Highlights key insights, patterns, anomalies, and trends
- Personalized based on optional user prompt

### 📊 Auto-Generated Charts
**Multiple visualization types:**
1. **Correlation Matrix** - Heatmap showing relationships between variables
2. **Outlier Heatmap** - Visual identification of anomalies
3. **Trend Forecast** - Time series with predictions
4. **Cluster Visualization** - Scatter plots with cluster groups (A, B, C, etc.)
5. **Distribution Charts** - Histograms, box plots
6. **Summary Statistics** - Key metrics dashboard

### 🎯 InsightCard (Shareable)
**One embeddable/shareable card containing:**
- AI-generated story
- All charts (interactive or static)
- On-chain proof (Sui transaction hash, Walrus CID)
- Metadata (timestamp, workers used, verification status)
- Shareable link/embed code

### 💬 Optional Prompt
**Personalized analysis:**
- User can ask: *"Which product is growing fastest?"*
- AI tailors the story and highlights relevant charts
- Interactive Q&A style analysis

### 🔄 Flow
```
Upload CSV → Optional Prompt → Federated Learning → 
AI Story Generation → Charts Generation → InsightCard Creation
```

## Technology Stack

### Core Framework
- **React 18+** with TypeScript
- **Vite** for build tooling and dev server
- **TypeScript** for type safety

### UI Framework & Styling
- **Tailwind CSS** (recommended) or **CSS Modules** for styling
- **Modern CSS** with CSS variables for theming
- **Responsive design** (mobile-first approach)
- **Dark mode support** (optional but recommended)

### UI Component Library (Choose One)
- **shadcn/ui** (recommended - modern, customizable, Tailwind-based)
- **Radix UI** primitives (headless, accessible)
- **Mantine** (full-featured, modern)
- **Chakra UI** (simple, accessible)

### State Management
- **React Query / TanStack Query** for server state (API calls, caching)
- **Zustand** or **Jotai** for client state (UI state, form state)
- **React Context** for global app state (wallet connection, user session)

### Form Handling
- **React Hook Form** for form validation and handling
- **Zod** for schema validation (TypeScript-first)

### Real-time Updates
- **EventSource API** (native) for Server-Sent Events (SSE)
- **Custom SSE hook** for progress updates

### Blockchain Integration
- **@mysten/sui/wallet-kit** or **@mysten/wallet-adapter-react** for Sui Wallet integration
- **@mysten/sui/cryptography** for session key generation

### Data Visualization (CRITICAL - Core Feature)
- **Recharts** (recommended) or **Chart.js** or **Victory** for interactive charts
- **D3.js** (optional) for advanced custom visualizations
- **react-heatmap-grid** or custom for correlation/outlier heatmaps
- **react-plotly.js** (optional) for advanced 3D/cluster visualizations
- **react-json-view** for JSON display (audit logs)
- **Chart types needed:**
  - Correlation matrix (heatmap)
  - Outlier detection (heatmap/scatter)
  - Trend forecast (line chart with prediction)
  - Cluster visualization (scatter with groups)
  - Distribution charts (histogram, box plot)
  - Summary statistics (cards/metrics)

### File Handling
- **react-dropzone** for drag-and-drop file upload
- **File validation** (CSV format, size limits)

### Utilities
- **date-fns** or **dayjs** for date formatting
- **clsx** or **classnames** for conditional classes
- **react-hot-toast** or **sonner** for notifications
- **html2canvas** or **react-to-image** for InsightCard export (PNG/PDF)
- **copy-to-clipboard** for sharing links/codes

## Design System & Style

### Color Palette
```
Primary: Blue/Purple gradient (tech, blockchain theme)
  - Primary: #6366f1 (indigo-500)
  - Primary Dark: #4f46e5 (indigo-600)
  - Primary Light: #818cf8 (indigo-400)

Secondary: Green (success, verified)
  - Success: #10b981 (emerald-500)
  - Verified: #059669 (emerald-600)

Accent: Orange/Amber (warnings, processing)
  - Warning: #f59e0b (amber-500)
  - Processing: #fbbf24 (amber-400)

Error: Red
  - Error: #ef4444 (red-500)

Neutral: Gray scale
  - Background: #0f172a (slate-900) for dark mode
  - Surface: #1e293b (slate-800)
  - Border: #334155 (slate-700)
  - Text Primary: #f1f5f9 (slate-100)
  - Text Secondary: #cbd5e1 (slate-300)
```

### Typography
- **Font Family**: Inter, system-ui, sans-serif (modern, readable)
- **Headings**: Bold, clear hierarchy (h1: 2.5rem, h2: 2rem, h3: 1.5rem)
- **Body**: 1rem, line-height 1.6
- **Monospace**: For addresses, hashes, code (JetBrains Mono, Fira Code)

### Spacing & Layout
- **Container**: Max-width 1280px, centered
- **Grid**: 12-column grid system
- **Spacing**: 4px base unit (4, 8, 12, 16, 24, 32, 48, 64px)
- **Border Radius**: 8px (cards), 12px (modals), 4px (inputs)

### Components Style
- **Cards**: Elevated with shadow, rounded corners, subtle border
- **Buttons**: Rounded, clear hierarchy (primary, secondary, ghost)
- **Inputs**: Clean borders, focus states, error states
- **Badges**: Small, rounded, colored (verified ✅, pending ⏳, error ❌)

## Key Features & Components

### 🎯 Priority Order (Most Important First)

1. **AI Data Story** - The hero content, natural language insights
2. **Auto-Generated Charts** - Visualizations (correlation, outliers, trends, clusters)
3. **InsightCard** - Shareable card with story + charts + proof
4. **Optional Prompt** - Personalized analysis
5. **Progress Tracking** - Real-time updates
6. **On-Chain Proof** - Verification and provenance
7. **Monitor Nodes** - Technical dashboard

### 1. Landing / Upload Page

**Main Upload Section:**
- Large drag-and-drop zone (CSV files)
- File validation (format, size)
- Upload progress indicator
- Preview uploaded file (row count, columns, sample data)
- "Analyze" button (disabled until file selected)

**Optional Prompt Input (Key Feature):**
- Prominent textarea for personalized analysis
- Character counter
- Placeholder examples:
  - "Which product is growing fastest?"
  - "Find anomalies in my sales data"
  - "What are the main customer segments?"
- AI icon/indicator showing this will personalize the story
- Optional but encouraged (show benefits)

**Session Key Generation:**
- Sui Wallet connect button
- Auto-generate session key on connect
- Display session key (truncated) with copy button
- Fallback: Generate ephemeral keypair (show warning)
- Less prominent (technical detail)

**Visual Design:**
- Clean, centered layout
- Prominent upload area
- **Prompt input is prominent** (this personalizes the AI story)
- Clear CTAs
- Status indicators
- Show example: "See what insights await →"

### 2. Progress Tracking (Real-time)

**SSE Progress Stream:**
- Real-time progress updates via Server-Sent Events
- Progress bar (0-100%)
- Stage indicators:
  - 📤 Uploading
  - 🔐 Encrypting shards
  - 📡 Dispatching to workers
  - 🏋️ Training (with worker status)
  - 🔄 Aggregating
  - ✅ Storing provenance
  - 🎉 Complete

**Worker Status Cards:**
- Per-worker status (worker-1, worker-2)
- Hardware info (CPU cores, RAM)
- Signature verification status (✅ verified / ❌ failed)
- Sui address (truncated, copyable)
- Training progress (loss history mini-chart)

**Visual Design:**
- Timeline-style progress
- Animated progress bar
- Worker cards with status badges
- Real-time updates (smooth animations)

### 3. Results / Insight Page (CORE FEATURE - Most Important)

**AI Data Story Section (Hero):**
- Large, prominent text area displaying AI-generated narrative
- Beautiful typography (serif or modern sans-serif for readability)
- Highlighted key insights (bold, colored)
- Example display:
  ```
  "Your dataset shows 14% growth in Q3, with anomalies in row 257. 
  Three clusters emerge: A (high spenders), B (regular users), C (dormant)."
  ```
- Optional: Text-to-speech button
- Copy story button

**Auto-Generated Charts Grid:**
- **Correlation Matrix**: Interactive heatmap with tooltips
- **Outlier Heatmap**: Color-coded anomaly detection
- **Trend Forecast**: Line chart with confidence intervals
- **Cluster Visualization**: Scatter plot with labeled groups (A, B, C)
- **Distribution Charts**: Histograms, box plots for key variables
- **Summary Statistics**: Cards with key metrics (mean, median, std dev, etc.)
- Each chart: Expandable, downloadable (PNG/SVG), interactive tooltips

**InsightCard Preview:**
- Live preview of shareable card
- Shows: Story + Charts + On-chain proof
- Export options: PNG, PDF, Shareable link, Embed code
- Social sharing buttons (Twitter, LinkedIn, etc.)

**On-Chain Proof Section:**
- Sui transaction hash (clickable, opens explorer)
- Walrus CID (clickable, opens storage)
- Verification badges (✅ Verified, 🔐 Encrypted, 📊 Provenance)
- Timestamp and metadata

**Worker Updates (Collapsible Section):**
- Per-worker results (technical details)
- Loss history (mini charts)
- Signature status
- Hardware info
- Expandable for technical users

**Audit Log (Collapsible Section):**
- Expandable JSON viewer
- Complete trace (training start, decrypt events, policy calls, etc.)
- Searchable, filterable
- Download as JSON

**Visual Design:**
- Story-first layout (AI narrative is hero)
- Charts in responsive grid (2-3 columns)
- InsightCard preview prominently displayed
- On-chain proof clearly visible
- Technical details collapsible (don't overwhelm)
- Beautiful, magazine-style layout

### 4. Monitor Nodes Page

**Node Dashboard:**
- Grid of worker cards
- Each card shows:
  - Node ID (worker-1, worker-2)
  - Hardware info (CPU cores, RAM, platform)
  - Sui address
  - Signature status (✅ verified / ❌ unavailable)
  - Last seen timestamp
  - Status badge (online/offline)

**Display Format:**
```
Worker-1 · 6 cores · sig verified ✅
Worker-2 · 4 cores · sig verified ✅
```

**Visual Design:**
- Dashboard-style grid
- Status indicators
- Refresh button
- Auto-refresh (every 5-10 seconds)

### 5. Navigation & Layout

**Header:**
- Logo / Brand name
- Navigation links (Upload, Monitor, Results)
- Sui Wallet connection status
- User address (if connected, truncated)
- Dark mode toggle (optional)

**Sidebar (Optional):**
- Quick links
- Recent analyses
- Settings

**Footer:**
- Links (Docs, GitHub, etc.)
- Version info
- Network status (testnet/mainnet)

## UX Requirements

### User Flow

1. **Landing → Upload**
   - User lands on upload page
   - Uploads CSV file (drag-and-drop or browse)
   - **Optionally enters prompt** (e.g., "Which product is growing fastest?")
   - Connects Sui Wallet (optional but recommended for encryption)
   - Clicks "Analyze"

2. **Upload → Progress**
   - Redirect to progress page
   - Show real-time updates
   - Display worker status
   - Show encryption/decryption stages
   - Anticipation: "Generating your AI story..."

3. **Progress → Results (THE MOMENT)**
   - Auto-redirect when complete
   - **Hero: AI Data Story** (large, beautiful typography)
   - **Charts grid** (correlation, outliers, trends, clusters)
   - **InsightCard preview** (shareable card)
   - On-chain proof (verification badges)
   - Technical details (collapsible)

4. **Results → Share**
   - User can export InsightCard (PNG, PDF)
   - Generate shareable link
   - Copy embed code
   - Share on social media

5. **Monitor → Dashboard**
   - Accessible from navigation
   - Real-time worker status
   - Hardware info
   - Signature verification

### Interactions

- **File Upload**: Drag-and-drop, click to browse, file validation
- **Wallet Connect**: One-click connect, session key auto-generation
- **Progress**: Real-time updates, smooth animations
- **Results**: Expandable sections, interactive charts
- **Copy Actions**: One-click copy for addresses, hashes, CIDs
- **Notifications**: Toast notifications for success/error states

### Error Handling

- **File Errors**: Clear error messages (wrong format, too large)
- **Network Errors**: Retry buttons, error messages
- **Wallet Errors**: Clear instructions, fallback options
- **Worker Errors**: Show which worker failed, retry option

### Loading States

- **Skeleton loaders** for async content
- **Spinners** for actions
- **Progress bars** for uploads
- **Placeholder content** while loading

## API Integration

### Endpoints

```typescript
// Health check
GET /api/health

// Full health (with workers)
GET /api/health/full

// Monitor nodes
GET /api/monitor/nodes

// Progress stream (SSE)
GET /api/progress

// Upload file
POST /api/upload
  FormData: {
    file: File
    prompt: string
    sessionKey?: string
    userAddress?: string
  }

// Decrypt (internal, workers use)
POST /api/decrypt
```

### React Query Setup

```typescript
// Example queries
useQuery(['health'], fetchHealth)
useQuery(['monitor'], fetchMonitorNodes, { refetchInterval: 5000 })
useMutation(['upload'], uploadFile)
useSSE(['progress'], '/api/progress')
```

## State Management

### Global State (Zustand/Jotai)

```typescript
interface AppState {
  // Wallet
  walletConnected: boolean
  userAddress: string | null
  sessionKey: string | null
  
  // Current analysis
  currentAnalysis: AnalysisResult | null
  progress: ProgressState | null
  
  // UI
  theme: 'light' | 'dark'
  sidebarOpen: boolean
}
```

### Server State (React Query)

- Health status
- Worker nodes
- Analysis results
- Progress updates (SSE)

## Responsive Design

### Breakpoints
- **Mobile**: < 640px (single column, stacked)
- **Tablet**: 640px - 1024px (2 columns)
- **Desktop**: > 1024px (full layout, sidebar)

### Mobile Considerations
- Touch-friendly buttons (min 44x44px)
- Swipeable cards
- Collapsible sections
- Bottom navigation (optional)

## Accessibility

- **WCAG 2.1 AA** compliance
- Keyboard navigation
- Screen reader support
- Focus indicators
- ARIA labels
- Color contrast (4.5:1 minimum)

## Performance

- **Code splitting** (route-based)
- **Lazy loading** for heavy components
- **Image optimization** (if any)
- **Bundle size** optimization
- **SSE connection** management (cleanup on unmount)

## Security

- **Input sanitization** (XSS prevention)
- **CSRF protection** (if needed)
- **Secure wallet integration**
- **No sensitive data in localStorage** (use sessionStorage or secure storage)

## Testing Considerations

- **Component tests** (React Testing Library)
- **Integration tests** (API mocking)
- **E2E tests** (Playwright/Cypress) - optional

## File Structure (Recommended)

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Base UI components (buttons, inputs, cards)
│   │   ├── upload/          # Upload components
│   │   ├── progress/        # Progress tracking components
│   │   ├── results/         # Results/insight components
│   │   ├── monitor/         # Monitor nodes components
│   │   └── wallet/          # Wallet integration components
│   ├── hooks/
│   │   ├── useSSE.ts        # SSE hook
│   │   ├── useWallet.ts     # Wallet hook
│   │   └── useSessionKey.ts # Session key hook
│   ├── lib/
│   │   ├── api.ts           # API client
│   │   ├── utils.ts         # Utilities
│   │   └── constants.ts     # Constants
│   ├── stores/
│   │   └── appStore.ts      # Global state
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   ├── pages/
│   │   ├── Upload.tsx
│   │   ├── Progress.tsx
│   │   ├── Results.tsx
│   │   └── Monitor.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js (if using Tailwind)
```

## Key Integrations

### 1. Sui Wallet Integration

```typescript
// Connect wallet
const wallet = useWallet()
await wallet.connect()

// Generate session key
const sessionKey = await generateSessionKey(wallet)
```

### 2. File Upload

```typescript
// Handle file drop
const { getRootProps, getInputProps } = useDropzone({
  accept: { 'text/csv': ['.csv'] },
  maxSize: 200 * 1024 * 1024, // 200MB
  onDrop: handleFileDrop
})
```

### 3. SSE Progress

```typescript
// Real-time progress
useSSE('/api/progress', {
  onMessage: (event) => {
    const data = JSON.parse(event.data)
    updateProgress(data)
  }
})
```

## Design Inspiration

- **Story-First**: AI narrative is the hero, beautiful typography
- **Data Visualization**: Charts are prominent, interactive, beautiful
- **Magazine-Style**: Editorial layout for insights (like Medium, Substack)
- **Modern**: Clean, minimal, tech-forward
- **Trust indicators**: Verification badges, on-chain proofs visible
- **Shareable**: InsightCard is beautiful, embeddable, social-ready
- **Professional**: Enterprise-grade, production-ready feel

### Visual References
- **Data Stories**: Observable, Flourish, Datawrapper
- **AI Narratives**: ChatGPT interface, Anthropic Claude
- **Charts**: Recharts examples, Chart.js gallery
- **Shareable Cards**: Twitter cards, LinkedIn previews

## Deliverables

1. **Complete React/TypeScript frontend**
2. **AI Data Story Display** - Beautiful, prominent narrative section
3. **Auto-Generated Charts** - All 6+ chart types (correlation, outliers, trends, clusters, distributions, stats)
4. **InsightCard Component** - Shareable card with export (PNG, PDF, link, embed)
5. **Optional Prompt Input** - Personalized analysis feature
6. **Responsive design** (mobile, tablet, desktop)
7. **All key features** (upload, progress, results, monitor)
8. **Wallet integration** (Sui Wallet)
9. **Real-time updates** (SSE)
10. **Error handling** and loading states
11. **Accessibility** (WCAG 2.1 AA)
12. **TypeScript types** for all API responses
13. **Documentation** (README, component docs)

## Critical Success Factors

✅ **AI Story is the hero** - Large, beautiful, readable
✅ **Charts are interactive** - Tooltips, zoom, download
✅ **InsightCard is shareable** - Export, embed, social-ready
✅ **Prompt personalizes** - User's question shapes the story
✅ **Visual appeal** - Magazine-style, professional, impressive

## Notes for v.0 AI

- Use this brief as the complete specification
- Focus on modern, production-ready UI/UX
- Ensure all backend integrations work correctly
- Test with real API endpoints
- Include proper error states and loading states
- Make it visually impressive (hackathon demo quality)
- Ensure responsive design works on all devices

---

**Ready for v.0 AI Implementation** 🚀

