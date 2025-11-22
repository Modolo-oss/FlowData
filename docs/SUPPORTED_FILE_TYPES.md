# Supported File Types

## Overview

FlowData Studio mendukung **7 jenis file** untuk analisis data. Setiap jenis file memiliki analyzer khusus yang mengekstrak insights sesuai dengan formatnya.

## Supported File Types

### 1. **CSV** (Comma-Separated Values) ✅

**Extensions:** `.csv`

**Analyzer:** `csvAnalyzer.ts`

**What it does:**
- Parse CSV dengan header row
- Extract columns (numeric & categorical)
- Calculate statistics (mean, min, max, median, std)
- Find correlations antara columns
- Detect trends (jika ada time-based column)
- Identify clusters dan outliers

**Example Output:**
```json
{
  "num_samples": 150,
  "columns": ["id", "name", "age", "income", "score"],
  "numeric_columns": ["age", "income", "score"],
  "categorical_columns": ["id", "name"],
  "statistics": {...},
  "correlations": [...],
  "trends": [...],
  "clusters": [...],
  "outliers": [...]
}
```

### 2. **JSON** (JavaScript Object Notation) ✅

**Extensions:** `.json`

**Analyzer:** `jsonAnalyzer.ts`

**What it does:**
- Parse JSON (array of objects atau single object)
- Flatten nested objects
- Convert ke CSV format untuk re-use CSV analyzer
- Extract same insights seperti CSV

**Example Input:**
```json
[
  {"name": "John", "age": 30, "income": 50000},
  {"name": "Jane", "age": 25, "income": 60000}
]
```

**Example Output:**
Same structure as CSV (karena di-convert ke CSV format)

### 3. **Images** (PNG, JPEG, GIF, WebP) ✅

**Extensions:** `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`

**Analyzer:** `imageAnalyzer.ts`

**What it does:**
- Extract image metadata:
  - Width & Height (dimensions)
  - Format (PNG, JPEG, GIF, WebP)
  - File size
  - Has alpha channel (transparency)

**Example Output:**
```json
{
  "num_samples": 1,
  "columns": ["width", "height", "size", "format"],
  "statistics": {
    "width": {"mean": 1920, "min": 1920, "max": 1920},
    "height": {"mean": 1080, "min": 1080, "max": 1080},
    "size": {"mean": 245678, "min": 245678, "max": 245678}
  },
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "png",
    "size": 245678,
    "hasAlpha": true
  }
}
```

**Note:** Images tidak punya correlations, trends, clusters, atau outliers (karena hanya 1 sample).

### 4. **PDF** (Portable Document Format) ✅

**Extensions:** `.pdf`

**Analyzer:** `pdfAnalyzer.ts`

**What it does:**
- Extract text content dari PDF
- Calculate text statistics:
  - Word count
  - Character count
  - Line count
  - Page count (jika bisa di-detect)

**Example Output:**
```json
{
  "num_samples": 1,
  "columns": ["word_count", "char_count", "line_count"],
  "statistics": {
    "word_count": {"mean": 1250, "min": 1250, "max": 1250},
    "char_count": {"mean": 7500, "min": 7500, "max": 7500},
    "line_count": {"mean": 45, "min": 45, "max": 45}
  },
  "extractedText": "Full text content from PDF..."
}
```

**Note:** PDF text extraction adalah basic implementation. Untuk production, consider menggunakan `pdf-parse` library.

### 5. **Word Documents** (DOC, DOCX) ✅

**Extensions:** `.doc`, `.docx`

**Analyzer:** `wordAnalyzer.ts`

**What it does:**
- Extract text content dari Word document
- Calculate text statistics:
  - Word count
  - Character count
  - Line count

**Example Output:**
```json
{
  "num_samples": 1,
  "columns": ["word_count", "char_count", "line_count"],
  "statistics": {
    "word_count": {"mean": 800, "min": 800, "max": 800},
    "char_count": {"mean": 4500, "min": 4500, "max": 4500},
    "line_count": {"mean": 30, "min": 30, "max": 30}
  },
  "extractedText": "Full text content from Word document..."
}
```

**Note:** Word text extraction adalah basic implementation. Untuk production, consider menggunakan `mammoth` library untuk .docx.

### 6. **Text Files** (Plain Text) ✅

**Extensions:** `.txt`

**Analyzer:** `fileAnalyzer.ts` (text case)

**What it does:**
- Jika file terlihat seperti CSV (ada comma dan multiple lines), parse sebagai CSV
- Jika tidak, analyze sebagai plain text:
  - Word count
  - Character count
  - Line count

**Example Output:**
```json
{
  "num_samples": 1,
  "columns": ["word_count", "char_count", "line_count"],
  "statistics": {
    "word_count": {"mean": 500, "min": 500, "max": 500},
    "char_count": {"mean": 3000, "min": 3000, "max": 3000},
    "line_count": {"mean": 20, "min": 20, "max": 20}
  },
  "extractedText": "Full text content..."
}
```

### 7. **Unknown/Unsupported** ⚠️

**Extensions:** Any other file type

**What it does:**
- Return empty insights:
  - `num_samples: 0`
  - `columns: []`
  - No statistics, correlations, trends, clusters, outliers

**Note:** User akan dapat warning bahwa file type tidak didukung.

## File Type Detection

**Detector:** `fileTypeDetector.ts`

**Detection Method:**
1. **Magic Bytes** (file signature) - untuk binary files (PDF, images, Word)
2. **File Extension** - fallback jika magic bytes tidak jelas
3. **Content Analysis** - untuk text files (CSV, JSON, plain text)

**Supported MIME Types:**
- `text/csv` → CSV
- `application/json` → JSON
- `image/png`, `image/jpeg`, `image/gif`, `image/webp` → Images
- `application/pdf` → PDF
- `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → Word
- `text/plain` → Text

## Frontend File Input

**Accept Attribute:**
```html
<input 
  type="file" 
  accept=".csv,.json,.txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
/>
```

**Allowed Types (JavaScript validation):**
```typescript
const allowedTypes = [
  'text/csv',
  'application/json',
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
];
```

## Analysis Capabilities by File Type

| File Type | Statistics | Correlations | Trends | Clusters | Outliers | Text Extraction |
|-----------|-----------|--------------|--------|----------|----------|----------------|
| **CSV** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **JSON** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Images** | ✅ (metadata) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PDF** | ✅ (text stats) | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Word** | ✅ (text stats) | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Text** | ✅ (text stats) | ❌ | ❌ | ❌ | ❌ | ✅ |

## Summary

✅ **7 File Types Supported:**
1. CSV - Full analysis (statistics, correlations, trends, clusters, outliers)
2. JSON - Full analysis (converted to CSV format)
3. Images (PNG, JPEG, GIF, WebP) - Metadata extraction
4. PDF - Text extraction + text statistics
5. Word (DOC, DOCX) - Text extraction + text statistics
6. Text (TXT) - Text statistics (or CSV if looks like CSV)
7. Unknown - Empty insights (warning shown)

**Best for Data Analysis:** CSV & JSON (full statistical analysis)
**Best for Document Analysis:** PDF & Word (text extraction + statistics)
**Best for Media Analysis:** Images (metadata extraction)


