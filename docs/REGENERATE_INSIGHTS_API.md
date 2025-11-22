# Regenerate Insights API

## Overview

Endpoint untuk regenerate AI insights dengan prompt baru **tanpa perlu upload ulang file**. Menggunakan `analysisSummary` yang sudah ada di Walrus (encrypted dengan Seal).

## Endpoint

### `POST /api/regenerate-insights`

Regenerate insights dengan prompt baru.

**Request Body:**
```json
{
  "blobId": "CNJCk9Kqbp06dyRmsjwbU0ounASyhDATWN8Urv8HOkE",
  "prompt": "Which product segment is growing fastest?",
  "sessionKey": "optional_session_key_for_decryption"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "llmInsights": {
      "title": "Product Growth Analysis",
      "summary": "Your dataset shows that Product Segment A is growing fastest...",
      "keyFindings": [
        "Product Segment A shows 25% growth",
        "Product Segment B is declining"
      ],
      "recommendations": [
        "Focus marketing on Product Segment A",
        "Investigate decline in Product Segment B"
      ],
      "chartRecommendations": [
        "line chart product revenue over time",
        "bar chart product growth rate comparison"
      ]
    },
    "chartRecommendations": [
      "line chart product revenue over time",
      "bar chart product growth rate comparison"
    ],
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "chartData": {
      "correlationMatrix": [...],
      "trends": [...],
      "clusters": [...],
      "outliers": [...],
      "summary": {...}
    },
    "analysisSummary": {
      "dataInsights": {...},
      "chartsData": {...}
    }
  }
}
```

## Flow

```
1. Frontend call POST /api/regenerate-insights dengan blobId + prompt
   ↓
2. Backend fetch blob dari Walrus menggunakan blobId
   ↓
3. Backend decrypt payload menggunakan Seal (jika encrypted)
   ↓
4. Backend extract analysisSummary dari AuditPayload
   ↓
5. Backend call generateInsightFromAnalysis({ analysisSummary, userPrompt: prompt })
   ↓
6. Backend return llmInsights baru + chartData (unchanged)
   ↓
7. Frontend update UI dengan insights baru
```

## Implementation Details

### Backend (`backend/src/coordinator/server.ts`)

```typescript
app.post("/api/regenerate-insights", async (req, res) => {
  const { blobId, prompt, sessionKey } = req.body;
  
  // 1. Fetch from Walrus
  const walrusResult = await readFromWalrus(blobId, sessionKey);
  
  // 2. Extract AuditPayload
  const auditPayload = walrusResult.data as AuditPayload;
  
  // 3. Generate new insights
  const newInsights = await generateInsightFromAnalysis({
    analysisSummary: auditPayload.analysisSummary,
    userPrompt: prompt,
  });
  
  // 4. Return updated insights
  return res.json({
    success: true,
    result: {
      llmInsights: newInsights,
      chartData: auditPayload.analysisSummary.chartsData,
      analysisSummary: auditPayload.analysisSummary,
      updatedAt: new Date().toISOString(),
    },
  });
});
```

### Frontend (`frontend/lib/api.ts`)

```typescript
export async function regenerateInsights(
  request: {
    blobId: string;
    prompt?: string;
    sessionKey?: string;
  }
): Promise<RegenerateInsightsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/regenerate-insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  return await response.json();
}
```

### Frontend Usage (`frontend/app/analysis/page.tsx`)

```typescript
<PromptInput 
  onSubmit={async (text) => {
    const result = await regenerateInsights({
      blobId: result.blobId,
      prompt: text,
    });
    
    if (result.success) {
      // Update UI with new insights
      setResult({
        ...result,
        llmInsights: result.result.llmInsights,
      });
    }
  }}
/>
```

## Kelebihan Arsitektur

1. **Tidak perlu upload ulang**
   - User hanya perlu input prompt baru
   - File tidak perlu di-upload lagi

2. **Chart & analysis tetap sama**
   - `chartData` dan `analysisSummary` tidak berubah
   - Hanya `llmInsights` yang di-regenerate

3. **Tetap aman**
   - Data di Walrus tetap encrypted dengan Seal
   - Hanya backend yang bisa decrypt
   - Raw file tidak pernah disimpan

4. **Efisien**
   - Tidak perlu re-analyze file
   - Hanya call LLM dengan prompt baru
   - Tidak menyentuh Walrus lagi (hanya read sekali)

5. **Fast response**
   - Tidak ada heavy computation
   - Hanya LLM API call
   - Response time ~2-5 detik

## Error Handling

**Error: blobId is required**
```json
{
  "error": "blobId is required"
}
```

**Error: Invalid payload**
```json
{
  "error": "Invalid payload: missing analysisSummary"
}
```

**Error: Failed to regenerate**
```json
{
  "error": "Failed to regenerate insights"
}
```

## Security Considerations

1. **Seal Decryption**
   - Payload di Walrus encrypted dengan Seal
   - Backend decrypt menggunakan `sessionKey` (optional)
   - Jika tidak ada `sessionKey`, decrypt menggunakan default Seal key

2. **No Raw File Storage**
   - Raw file tidak pernah disimpan
   - Hanya `analysisSummary` yang disimpan
   - User tidak bisa access raw file dari regenerate endpoint

3. **Rate Limiting** (Future)
   - Bisa tambahkan rate limiting untuk prevent abuse
   - Limit regenerate per blobId per time period

## Future Enhancements

1. **Caching**
   - Cache insights untuk prompt yang sama
   - Reduce LLM API calls

2. **Batch Regenerate**
   - Support multiple prompts at once
   - Return multiple insights

3. **Insight History**
   - Store history of regenerated insights
   - Allow user to compare different insights

4. **Custom Chart Generation**
   - Generate custom charts based on prompt
   - Not just recommendations, but actual chart data


