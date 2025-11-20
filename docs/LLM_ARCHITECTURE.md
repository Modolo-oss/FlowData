# LLM (Ollama) Integration Architecture

## Overview
Integrasi LLM lokal (Ollama) untuk generate AI insights dan visualisasi dari hasil federated learning training.

## Arsitektur

### Flow Diagram
```
1. Workers Complete Training
   ↓
2. Coordinator Aggregate Results (70%)
   ↓
3. Coordinator → Call Ollama API (75%)
   ├─ Prepare metrics & training data
   ├─ Build prompt with context
   └─ Generate AI insight
   ↓
4. Ollama → Generate AI Story/Insights
   ├─ Title (concise)
   ├─ Summary (2-3 paragraphs)
   ├─ Key Findings (3-5 bullet points)
   ├─ Recommendations (optional)
   └─ Visualization Hints
   ↓
5. Coordinator → Include in AggregationResult
   ↓
6. Frontend → Display AI-Generated Insight
```

## Lokasi Implementation

### 1. Ollama Service (`backend/src/services/llm.ts`)
**Purpose**: Service untuk komunikasi dengan Ollama API

**Functions**:
- `generateInsight(request: InsightRequest): Promise<InsightResponse>`
  - Call Ollama API untuk generate AI insight
  - Parse response ke structured format
  - Fallback jika Ollama gagal

- `checkOllamaHealth(): Promise<boolean>`
  - Check apakah Ollama service available
  - Health check untuk graceful degradation

**Input**:
```typescript
{
  metrics: {
    numWorkers: number;
    avgFinalLoss: number;
    numSamples: number[];
    lossHistories: number[][];
    workerInfo: Array<{
      nodeId: string;
      suiAddress?: string;
      numSamples: number;
      finalLoss: number;
    }>;
  };
  userPrompt?: string;
  aggregatedHash: string;
  hasEncryption: boolean;
}
```

**Output**:
```typescript
{
  title: string;
  summary: string;
  keyFindings: string[];
  recommendations?: string[];
  visualizationHints?: {
    correlation?: string[];
    trends?: string[];
    clusters?: string[];
  };
}
```

### 2. Coordinator Integration (`backend/src/coordinator/server.ts`)
**Location**: Setelah aggregation (line ~463)

**Flow**:
1. Aggregate training results (70% progress)
2. Generate AI insight dengan Ollama (75% progress)
   - Check Ollama availability
   - Prepare metrics dari training results
   - Call `generateInsight()`
   - Handle errors dengan fallback
3. Include AI insight di `AggregationResult`
4. Continue dengan Walrus upload & Sui record

**Progress Updates**:
- `70%`: Aggregating model updates...
- `75%`: Generating AI insights with Ollama...
- `80%`: Storing provenance...
- `85%`: Uploading audit log to Walrus...
- `90%`: Recording on-chain provenance...
- `100%`: Complete!

### 3. Type Updates (`backend/src/types.ts`)
**Added Fields**:
- `insight.keyFindings?: string[]` - AI-generated key findings
- `insight.recommendations?: string[]` - AI-generated recommendations
- `insight.visualizationHints?: {...}` - AI hints untuk visualisasi

### 4. Frontend Display (`frontend/app/analysis/page.tsx`)
**Current**: Display insight summary dari backend
**Enhanced**: Display AI-generated insights dengan:
- Title
- Summary (formatted)
- Key Findings (bullet points)
- Recommendations (optional)
- Visualization Hints (optional)

## Configuration

### Environment Variables
```bash
# Ollama Configuration (Optional - defaults provided)
OLLAMA_HOST=http://localhost:11434      # Default Ollama API URL (or use OLLAMA_BASE_URL)
OLLAMA_MODEL=llama3.2                    # Default local model

# Cloud Models (requires ollama.com signin)
OLLAMA_MODEL=gpt-oss:120b-cloud          # Large cloud model (120B)
OLLAMA_MODEL=gpt-oss:20b-cloud           # Smaller cloud model (20B)
OLLAMA_MODEL=deepseek-v3.1:671b-cloud    # DeepSeek cloud model (671B)
OLLAMA_MODEL=qwen3-coder:480b-cloud      # Code-focused cloud model (480B)
```

### Default Configuration
```typescript
{
  host: "http://localhost:11434",
  model: "llama3.2",  // or "gpt-oss:120b-cloud", "deepseek-v3.1:671b-cloud", etc.
  timeout: 60000, // 60 seconds (longer for cloud models)
}
```

## Setup Instructions

### 1. Install Ollama
```bash
# Download dari https://ollama.ai
# Atau install via package manager
```

### 2. Pull Model

**Local Models:**
```bash
# Pull default model (llama3.2)
ollama pull llama3.2

# Atau pull model lain
ollama pull mistral
ollama pull qwen2.5
```

**Cloud Models (requires ollama.com signin):**
```bash
# Sign in to ollama.com first
ollama signin

# Pull cloud models
ollama pull gpt-oss:120b-cloud       # Large model (120B parameters)
ollama pull gpt-oss:20b-cloud        # Smaller model (20B parameters)
ollama pull deepseek-v3.1:671b-cloud # DeepSeek model (671B parameters)
ollama pull qwen3-coder:480b-cloud   # Code-focused model (480B parameters)

# Verify models are available
ollama ls
```

### 3. Configure Environment
```bash
# Di .env file (opsional, default sudah OK)

# For local models
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2

# For cloud models (requires signin)
OLLAMA_MODEL=gpt-oss:120b-cloud
# or
OLLAMA_MODEL=deepseek-v3.1:671b-cloud
```

### 4. Start Ollama Service
```bash
# Ollama service akan start otomatis setelah install
# Verify dengan:
ollama list
```

### 5. Test Integration
```bash
# Start backend
cd backend
npm run dev:coordinator

# Test dengan training
# LLM akan dipanggil otomatis setelah aggregation
```

## Error Handling

### Graceful Degradation
- Jika Ollama tidak available → Fallback ke mock insight
- Jika Ollama error → Log error & fallback
- Progress tetap update meskipun LLM gagal

### Logging
- `[LLM] Ollama available, generating AI insight...`
- `[LLM] ✅ AI insight generated: {...}`
- `[LLM] Ollama not available, using fallback insight`
- `[LLM] Error generating insight: {...}`

## Benefits

### 1. AI-Generated Insights
- Natural language summary dari training results
- Contextual insights berdasarkan metrics
- Personalized dengan user prompt

### 2. Real-time Analysis
- Generate insights saat training selesai
- No manual analysis needed
- Consistent format & quality

### 3. Privacy-Preserving
- LLM run locally (Ollama)
- No data sent to external APIs
- Training data tetap private

### 4. Extensible
- Easy to add more models
- Customizable prompts
- Integration dengan other LLM providers

## Future Enhancements

### 1. Streaming Response
- Stream LLM response real-time
- Progress update per token
- Better UX dengan live updates

### 2. Multiple Models
- Support multiple models (mistral, qwen, etc.)
- Model selection per request
- Model comparison

### 3. Prompt Engineering
- Fine-tuned prompts untuk specific use cases
- Template system untuk different analysis types
- Context-aware prompt generation

### 4. Caching
- Cache similar insights
- Reduce LLM calls
- Faster response times

## Troubleshooting

### Ollama Not Available
**Symptom**: `[LLM] Ollama not available, using fallback insight`

**Solutions**:
1. Check Ollama service running: `ollama list`
2. Verify OLLAMA_BASE_URL correct
3. Check firewall/network settings

### Model Not Found
**Symptom**: `Error: model not found`

**Solutions**:
1. Pull model: `ollama pull llama3.2`
2. Check OLLAMA_MODEL setting
3. Verify model name correct

### Timeout Errors
**Symptom**: `Request timeout`

**Solutions**:
1. Increase timeout in `llm.ts`
2. Use smaller/faster model
3. Reduce prompt size

## Cloud Models

### Available Cloud Models
- `gpt-oss:120b-cloud` - Large GPT model (120B parameters)
- `gpt-oss:20b-cloud` - Smaller GPT model (20B parameters)
- `deepseek-v3.1:671b-cloud` - DeepSeek model (671B parameters)
- `qwen3-coder:480b-cloud` - Code-focused model (480B parameters)

### Using Cloud Models

1. **Sign in to ollama.com**:
   ```bash
   ollama signin
   ```

2. **Pull cloud model**:
   ```bash
   ollama pull gpt-oss:120b-cloud
   ```

3. **Configure environment**:
   ```bash
   OLLAMA_MODEL=gpt-oss:120b-cloud
   ```

4. **Verify model is available**:
   ```bash
   ollama ls
   ```

### Cloud Models vs Local Models

**Cloud Models:**
- ✅ Larger model sizes (20B-671B parameters)
- ✅ Better quality insights
- ✅ No local storage required
- ❌ Requires internet connection
- ❌ Requires ollama.com signin
- ❌ Slower response time (network latency)

**Local Models:**
- ✅ No internet required
- ✅ Faster response time
- ✅ Privacy (all processing local)
- ❌ Limited model sizes (usually < 20B)
- ❌ Requires local storage

## References

- [Ollama Documentation](https://ollama.ai/docs)
- [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Available Models](https://ollama.ai/library)
- [Cloud Models Guide](https://ollama.ai/blog/cloud-models)

