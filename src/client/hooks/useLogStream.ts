import { useState, useRef, useCallback, useEffect } from 'react';

interface LogFrame {
  Data?: string;
  FileEvent?: string;
  Offset?: number;
  File?: string;
}

interface UseLogStreamOptions {
  allocId: string;
  task: string;
  logType: 'stdout' | 'stderr';
  onError?: (error: string) => void;
}

interface UseLogStreamReturn {
  logs: string;
  isStreaming: boolean;
  startStream: () => void;
  stopStream: () => void;
  clearLogs: () => void;
}

/**
 * Decode base64 string to UTF-8 text.
 * atob() decodes to Latin-1, so we need to convert to UTF-8.
 */
function decodeBase64Utf8(base64: string): string {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

function parseLogFrames(text: string): LogFrame[] {
  const frames: LogFrame[] = [];

  // Split by newlines and try to parse each as JSON
  const lines = text.split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      const frame = JSON.parse(line) as LogFrame;
      frames.push(frame);
    } catch {
      // Not valid JSON, might be partial - skip
    }
  }

  return frames;
}

/**
 * Hook for streaming logs from Nomad allocation in real-time.
 * Uses HTTP streaming with follow=true parameter.
 */
export function useLogStream({
  allocId,
  task,
  logType,
  onError,
}: UseLogStreamOptions): UseLogStreamReturn {
  const [logs, setLogs] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const bufferRef = useRef<string>('');

  const startStream = useCallback(async () => {
    if (isStreaming || !allocId || !task) return;

    // Abort any existing stream
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsStreaming(true);
    bufferRef.current = '';

    try {
      const url = `/api/nomad/v1/client/fs/logs/${allocId}?task=${task}&type=${logType}&follow=true&origin=end&offset=50000`;

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to start log stream: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        bufferRef.current += chunk;

        // Try to parse complete frames from buffer
        const frames = parseLogFrames(bufferRef.current);

        if (frames.length > 0) {
          // Clear buffer after successful parse
          bufferRef.current = '';

          for (const frame of frames) {
            if (frame.Data) {
              // Decode base64 data as UTF-8
              try {
                const decodedData = decodeBase64Utf8(frame.Data);
                setLogs(prev => prev + decodedData);
              } catch {
                // Invalid base64, skip
              }
            }

            if (frame.FileEvent) {
              // Handle file events (truncated, deleted)
              if (frame.FileEvent === 'file truncated') {
                setLogs(prev => prev + '\n--- Log file truncated ---\n');
              } else if (frame.FileEvent === 'file deleted') {
                setLogs(prev => prev + '\n--- Log file deleted ---\n');
              }
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Stream was intentionally stopped
        return;
      }

      const message = error instanceof Error ? error.message : 'Stream error';
      onError?.(message);
    } finally {
      setIsStreaming(false);
    }
  }, [allocId, task, logType, isStreaming, onError]);

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs('');
    bufferRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Stop stream when allocation or task changes
  useEffect(() => {
    stopStream();
  }, [allocId, task, logType, stopStream]);

  return {
    logs,
    isStreaming,
    startStream,
    stopStream,
    clearLogs,
  };
}

export default useLogStream;
