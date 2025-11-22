/**
 * React hook for SSE progress updates
 */

import { useEffect, useState, useRef } from 'react';
import { createProgressStream, ProgressEvent } from '@/lib/api';

export interface ProgressState {
  stage: string;
  progress: number;
  message?: string;
  complete?: boolean;
  error?: string;
  result?: any;
}

export function useProgress(enabled: boolean = true) {
  const [state, setState] = useState<ProgressState>({
    stage: 'idle',
    progress: 0,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const eventSource = createProgressStream(
      (event: ProgressEvent) => {
        if (event.event === 'status') {
          setState((prev) => ({
            ...prev,
            stage: event.data.stage || prev.stage,
            progress: event.data.progress !== undefined ? event.data.progress : prev.progress, // Use backend progress percentage
            message: event.data.message || prev.message,
            error: undefined, // Clear error on successful status
          }));
        } else if (event.event === 'progress') {
          setState((prev) => ({
            ...prev,
            stage: event.data.stage || prev.stage,
            progress: event.data.progress !== undefined ? event.data.progress : prev.progress, // Use backend progress percentage
            message: event.data.message || prev.message,
            error: undefined, // Clear error on progress
          }));
        } else if (event.event === 'complete' || event.event === 'done') {
          // Backend broadcasts: { result: {...} }
          // So event.data is { result: {...} }, not the result directly
          const result = event.data.result || event.data;
          console.log('[PROGRESS] Received complete event:', {
            hasResult: !!result,
            hasAnalysisSummary: !!result?.analysisSummary,
            hasDataInsights: !!result?.analysisSummary?.dataInsights,
            num_samples: result?.analysisSummary?.dataInsights?.num_samples,
            columns: result?.analysisSummary?.dataInsights?.columns?.length,
            eventData: event.data, // Log full event data for debugging
          });
          setState((prev) => ({
            ...prev,
            complete: true,
            result: result, // Use result from event.data.result
            progress: 100,
            stage: 'complete',
            error: undefined,
          }));
          eventSource.close();
        } else if (event.event === 'message') {
          setState((prev) => ({
            ...prev,
            message: event.data.message || prev.message,
            error: undefined,
          }));
        }
      },
      (error) => {
        // Only log error in development, don't spam console
        if (process.env.NODE_ENV === 'development') {
          console.warn('Progress stream connection issue (backend may not be running):', error);
        }
        setState((prev) => ({
          ...prev,
          error: prev.error || 'Waiting for backend connection...',
        }));
        // Don't close on error, allow reconnection attempts
      }
    );

    // Clear error when connection opens successfully
    eventSource.onopen = () => {
      setState((prev) => ({
        ...prev,
        error: undefined,
        message: prev.message || 'Connected to progress stream',
      }));
    };

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [enabled]);

  const reset = () => {
    setState({
      stage: 'idle',
      progress: 0,
    });
  };

  return { ...state, reset };
}

