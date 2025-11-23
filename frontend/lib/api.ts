/**
 * API Client for FlowData Studio Backend
 * Handles all communication with the coordinator backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface UploadResponse {
  success: boolean;
  result?: any; // AnalysisResult from backend
  jobId?: string; // Legacy support
  message?: string;
  error?: string;
}

export interface ProgressEvent {
  event: string;
  data: any;
}

// Worker nodes removed - direct analysis flow

export interface AnalysisResult {
  success: boolean;
  jobId?: string;
  story?: string;
  charts?: {
    correlationMatrix: any[];
    trends: any[];
    clusters: any[];
  };
  onChainProof?: {
    suiTxHash?: string;
    walrusCid?: string;
  };
  error?: string;
}

/**
 * Upload file to backend for AI-powered data analysis
 */
export async function uploadFile(
  file: File,
  prompt?: string,
  sessionKey?: string,
  userAddress?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (prompt) {
    formData.append('prompt', prompt);
  }
  if (sessionKey) {
    formData.append('sessionKey', sessionKey);
  }
  if (userAddress) {
    formData.append('userAddress', userAddress);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      return { success: false, error: error.error || 'Upload failed' };
    }

    const data = await response.json();
    // Backend now returns result directly (no jobId needed)
    return { 
      success: true, 
      result: data.result, // AnalysisResult with insights, charts, etc.
      jobId: data.jobId, // Legacy support (if exists)
      message: data.message 
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Create EventSource for SSE progress updates
 */
export function createProgressStream(
  onMessage: (event: ProgressEvent) => void,
  onError?: (error: Event) => void
): EventSource {
  const eventSource = new EventSource(`${API_BASE_URL}/api/progress`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage({ event: 'message', data });
    } catch (error) {
      console.error('Failed to parse progress event:', error);
    }
  };

  eventSource.addEventListener('status', (event: any) => {
    try {
      const data = JSON.parse(event.data);
      onMessage({ event: 'status', data });
    } catch (error) {
      console.error('Failed to parse status event:', error);
    }
  });

  eventSource.addEventListener('progress', (event: any) => {
    try {
      const data = JSON.parse(event.data);
      onMessage({ event: 'progress', data });
    } catch (error) {
      console.error('Failed to parse progress event:', error);
    }
  });

  eventSource.addEventListener('complete', (event: any) => {
    try {
      const data = JSON.parse(event.data);
      onMessage({ event: 'complete', data });
    } catch (error) {
      console.error('Failed to parse complete event:', error);
    }
  });

  eventSource.addEventListener('done', (event: any) => {
    try {
      const data = JSON.parse(event.data);
      onMessage({ event: 'done', data });
    } catch (error) {
      console.error('Failed to parse done event:', error);
    }
  });

  eventSource.addEventListener('update', (event: any) => {
    try {
      const data = JSON.parse(event.data);
      onMessage({ event: 'update', data });
    } catch (error) {
      console.error('Failed to parse update event:', error);
    }
  });

  if (onError) {
    eventSource.onerror = onError;
  }

  return eventSource;
}

// getMonitorNodes removed - no workers in new flow

/**
 * Get health status
 */
export async function getHealthStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return await response.json();
  } catch (error: any) {
    return { ok: false, error: error.message || 'Network error' };
  }
}

/**
 * Get analysis results (after training completes)
 * This would typically be called after progress stream completes
 */
export async function getAnalysisResults(jobId: string): Promise<AnalysisResult> {
  try {
    // Note: This endpoint may need to be implemented in backend
    // For now, we'll use the data from progress stream
    const response = await fetch(`${API_BASE_URL}/api/results/${jobId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch results');
    }
    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Regenerate insights with new prompt
 * Fetches analysisSummary from Walrus and generates new LLM insights
 */
export interface RegenerateInsightsRequest {
  blobId: string;
  prompt?: string;
  sessionKey?: string;
}

export interface RegenerateInsightsResponse {
  success: boolean;
  result?: {
    llmInsights: {
      title: string;
      summary: string;
      keyFindings?: string[];
      recommendations?: string[];
      chartRecommendations?: string[];
    };
    chartRecommendations?: string[];
    updatedAt: string;
    chartData?: any;
    analysisSummary?: any;
  };
  error?: string;
}

export async function regenerateInsights(
  request: RegenerateInsightsRequest
): Promise<RegenerateInsightsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/regenerate-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blobId: request.blobId,
        prompt: request.prompt || '',
        sessionKey: request.sessionKey,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Regenerate failed' }));
      return { success: false, error: error.error || 'Regenerate failed' };
    }

    const data = await response.json();
    return { success: true, result: data.result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Download original file from Walrus (decrypted with Seal)
 * Returns a blob URL that can be used to download/view the file
 */
export async function downloadFile(
  blobId: string,
  fileName?: string,
  txBytes?: string,
  sessionKey?: string
): Promise<string> {
  try {
    const params = new URLSearchParams({ blobId });
    if (fileName) {
      params.append('fileName', fileName);
    }
    if (txBytes) {
      params.append('txBytes', txBytes);
    }
    if (sessionKey) {
      params.append('sessionKey', sessionKey);
    }

    const response = await fetch(`${API_BASE_URL}/api/download-file?${params.toString()}`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(error.error || 'Download failed');
    }

    // Get file blob
    const blob = await response.blob();
    
    // Create object URL for download/view
    const blobUrl = URL.createObjectURL(blob);
    
    return blobUrl;
  } catch (error: any) {
    throw new Error(error.message || 'Network error during file download');
  }
}

/**
 * Upload encrypted file to Walrus with wallet user signing
 * This uploads the encrypted file directly to Walrus using the user's wallet
 */
export interface UploadToWalrusRequest {
  encryptedFileData: string; // Base64 encoded encrypted file
  fileName?: string;
  userAddress: string;
  fileHash?: string;
  fileSize?: number;
  fileType?: string;
  num_samples?: number;
  columns?: number;
}

export interface UploadToWalrusResponse {
  success: boolean;
  blobId?: string;
  walrusScanUrl?: string;
  suiTx?: string;
  suiExplorerUrl?: string;
  error?: string;
}

export async function uploadToWalrusWithWallet(
  request: UploadToWalrusRequest,
  signTransactionBlock: (transactionBlock: any) => Promise<any>
): Promise<UploadToWalrusResponse> {
  try {
    // Convert base64 encrypted file to Uint8Array
    const encryptedFileBytes = Uint8Array.from(atob(request.encryptedFileData), c => c.charCodeAt(0));

    // Use @mysten/walrus SDK with wallet user signing
    const { SuiClient, getFullnodeUrl } = await import('@mysten/sui/client');
    const { walrus } = await import('@mysten/walrus');
    const { SuiJsonRpcClient } = await import('@mysten/sui/jsonRpc');

    const network = 'testnet'; // TODO: Get from config
    const suiClient = new SuiJsonRpcClient({
      url: getFullnodeUrl(network),
      network: network,
    }).$extend(walrus({
      storageNodeClientOptions: {
        timeout: 120_000, // 120 seconds
      },
    }));

    // ✅ Create proper signer adapter for Walrus SDK
    // Walrus SDK expects signer with toSuiAddress() method DIRECTLY on signer
    const walletSigner = {
      // ✅ Add toSuiAddress directly on signer (Walrus SDK calls signer.toSuiAddress())
      toSuiAddress: () => request.userAddress,
      getPublicKey: () => {
        // Return public key object with toSuiAddress method
        return {
          toSuiAddress: () => request.userAddress,
        };
      },
      signTransactionBlock: async (transactionBlock: any) => {
        // Use wallet's signTransactionBlock function
        // signTransactionBlock from dapp-kit expects TransactionBlock type
        return await signTransactionBlock(transactionBlock);
      },
      signPersonalMessage: async (message: Uint8Array) => {
        // Not needed for Walrus upload, but include for completeness
        throw new Error('signPersonalMessage not needed for Walrus upload');
      },
    };

    // Upload to Walrus with wallet user signing
    console.log('[WALRUS] Uploading encrypted file to Walrus with wallet user signing...');
    console.log('[WALRUS] Signer address:', request.userAddress);
    
    const result = await suiClient.walrus.writeBlob({
      blob: encryptedFileBytes,
      deletable: false,
      epochs: 30,
      signer: walletSigner as any,
    });

    const blobId = result.blobId;
    const walrusScanUrl = `https://scan.walrus.space/${network}/blob/${blobId}`;

    console.log('[WALRUS] ✅ File uploaded to Walrus:', blobId);

    // Record Walrus upload on backend
    const recordResponse = await fetch(`${API_BASE_URL}/api/record-walrus-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blobId,
        fileHash: request.fileHash,
        fileName: request.fileName,
        fileSize: request.fileSize,
        fileType: request.fileType,
        userAddress: request.userAddress,
        num_samples: request.num_samples,
        columns: request.columns,
      }),
    });

    if (!recordResponse.ok) {
      const error = await recordResponse.json().catch(() => ({ error: 'Failed to record Walrus upload' }));
      console.error('[WALRUS] Failed to record upload:', error);
      // Still return success because upload succeeded, just recording failed
    }

    const recordData = await recordResponse.json().catch(() => ({}));

    return {
      success: true,
      blobId,
      walrusScanUrl,
      suiTx: recordData.suiTx,
      suiExplorerUrl: recordData.suiExplorerUrl,
    };
  } catch (error: any) {
    console.error('[WALRUS] Upload failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload to Walrus',
    };
  }
}

