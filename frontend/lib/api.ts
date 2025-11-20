/**
 * API Client for FlowData Studio Backend
 * Handles all communication with the coordinator backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface UploadResponse {
  success: boolean;
  jobId?: string;
  message?: string;
  error?: string;
}

export interface ProgressEvent {
  event: string;
  data: any;
}

export interface WorkerNode {
  worker: string;
  ok: boolean;
  nodeId?: string;
  suiAddress?: string;
  cpuCores?: number;
  hardwareInfo?: any;
  signatureAvailable?: boolean;
  display?: string;
  detail?: any;
  error?: string;
}

export interface MonitorNodesResponse {
  ok: boolean;
  coordinator?: { port: number };
  workers: WorkerNode[];
  display?: string;
}

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
 * Upload CSV file to backend for federated learning
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
    return { success: true, jobId: data.jobId, message: data.message };
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

  if (onError) {
    eventSource.onerror = onError;
  }

  return eventSource;
}

/**
 * Get monitor nodes status
 */
export async function getMonitorNodes(): Promise<MonitorNodesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/monitor/nodes`);
    if (!response.ok) {
      throw new Error('Failed to fetch nodes');
    }
    return await response.json();
  } catch (error: any) {
    return {
      ok: false,
      workers: [],
      error: error.message || 'Network error',
    };
  }
}

/**
 * Get health status
 */
export async function getHealthStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health/full`);
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

