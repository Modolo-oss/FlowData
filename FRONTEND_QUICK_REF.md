# FlowData Studio - Frontend Quick Reference for v.0 AI

## 🎯 CORE ESSENCE (Most Important!)

**Primary Goal**: Transform raw CSV data into **AI-powered insights** with beautiful visualizations and shareable stories.

**User Experience:**
1. Upload CSV → Optional Prompt → Federated Learning
2. Get **AI Data Story** (natural language narrative)
3. See **Auto-Generated Charts** (correlation, outliers, trends, clusters)
4. Share **InsightCard** (story + charts + on-chain proof)

**Example Story**: *"Your dataset shows 14% growth in Q3, with anomalies in row 257. Three clusters emerge: A (high spenders), B (regular users), C (dormant)."*

## Tech Stack (Recommended)

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** + **shadcn/ui** (or Radix UI)
- **React Query** (server state) + **Zustand** (client state)
- **React Hook Form + Zod** (forms)
- **@mysten/sui/wallet-kit** (Sui Wallet)
- **Recharts** (charts)
- **react-dropzone** (file upload)
- **EventSource API** (SSE for progress)

## Key Pages & Features

### 1. Upload Page
- Drag-and-drop CSV upload
- Sui Wallet connect button
- Session key generation (auto on wallet connect)
- Prompt textarea
- "Analyze" button

### 2. Progress Page (Real-time)
- SSE progress stream (`/api/progress`)
- Progress bar (0-100%)
- Stage indicators: Upload → Encrypt → Dispatch → Train → Aggregate → Store
- Worker status cards (hardware info, signature status, Sui address)
- Real-time loss charts per worker

### 3. Results Page (THE HERO PAGE - Most Important!)
**AI Data Story Section:**
- Large, prominent narrative text
- Beautiful typography
- Example: "Your dataset shows 14% growth in Q3..."
- Copy story button

**Auto-Generated Charts Grid:**
- Correlation Matrix (heatmap)
- Outlier Heatmap (anomaly detection)
- Trend Forecast (line chart with predictions)
- Cluster Visualization (scatter with groups A, B, C)
- Distribution Charts (histograms, box plots)
- Summary Statistics (key metrics cards)
- All interactive with tooltips, zoom, download

**InsightCard Preview:**
- Live preview of shareable card
- Export: PNG, PDF, Shareable link, Embed code
- Social sharing buttons

**On-Chain Proof:**
- Sui transaction hash
- Walrus CID
- Verification badges

**Technical Details (Collapsible):**
- Worker updates table
- Audit log viewer

### 4. Monitor Nodes Page
- Worker dashboard grid
- Display: `"Worker-1 · 6 cores · sig verified ✅"`
- Hardware info, Sui address, status
- Auto-refresh every 5-10 seconds

## API Endpoints

```typescript
GET  /api/health
GET  /api/health/full
GET  /api/monitor/nodes
GET  /api/progress (SSE)
POST /api/upload (FormData: file, prompt, sessionKey, userAddress)
```

## Design Style

- **Theme**: Dark mode preferred, modern tech aesthetic
- **Colors**: Indigo/Purple primary, Green success, Amber warning
- **Typography**: Inter font, clear hierarchy
- **Layout**: Centered container, card-based, responsive grid

## Key Components Needed (Priority Order)

1. **AIStory** - AI-generated narrative display (HERO)
2. **ChartsGrid** - All visualizations (correlation, outliers, trends, clusters)
3. **InsightCard** - Shareable card with export options
4. **FileUpload** - Drag-and-drop zone with validation
5. **PromptInput** - Optional personalized analysis
6. **ProgressTracker** - SSE-based real-time progress
7. **WorkerStatusCard** - Per-worker status display
8. **AuditLogViewer** - JSON viewer for audit trace
9. **MonitorDashboard** - Worker nodes grid

## State Management

- **React Query**: API calls, caching, SSE
- **Zustand**: Wallet state, UI state, current analysis
- **React Context**: Global app state

## Critical Integrations

1. **Sui Wallet**: Connect, generate session key
2. **SSE Progress**: Real-time updates from `/api/progress`
3. **File Upload**: CSV validation, progress tracking
4. **Charts**: Loss history, metrics visualization

## UX Priorities (Order Matters!)

1. ✅ **AI Data Story** - Hero content, beautiful typography
2. ✅ **Auto-Generated Charts** - Interactive, beautiful, downloadable
3. ✅ **InsightCard** - Shareable, exportable, embeddable
4. ✅ **Optional Prompt** - Personalized analysis
5. ✅ Real-time progress updates (SSE)
6. ✅ On-chain proof display
7. ✅ Worker status visibility
8. ✅ Responsive design
9. ✅ Error handling
10. ✅ Loading states

## Critical Success Factors

✅ **Story-First Design** - AI narrative is the hero
✅ **Charts are Interactive** - Tooltips, zoom, download
✅ **InsightCard is Shareable** - Export, embed, social-ready
✅ **Visual Appeal** - Magazine-style, professional, impressive

---

**See `FRONTEND_REQUIREMENTS.md` for complete specification.**

