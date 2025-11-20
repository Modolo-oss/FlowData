/**
 * React hook for SSE progress updates
 */

import { useEffect, useState, useRef } from 'react';
import { createProgressStream, ProgressEvent } from '@/lib/api';

export interface ProgressState {
  stage: string;
  progress: number;
  message?: string;
  workers?: any[];
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
            workers: event.data.workers || prev.workers,
            error: undefined, // Clear error on successful status
          }));
        } else if (event.event === 'progress') {
          setState((prev) => ({
            ...prev,
            stage: event.data.stage || prev.stage,
            progress: event.data.progress !== undefined ? event.data.progress : prev.progress, // Use backend progress percentage
            message: event.data.message || prev.message,
            workers: event.data.workers || prev.workers,
            error: undefined, // Clear error on progress
          }));
        } else if (event.event === 'complete' || event.event === 'done') {
          setState((prev) => ({
            ...prev,
            complete: true,
            result: event.data,
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

