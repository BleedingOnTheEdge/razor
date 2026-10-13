'use client';

import { useState, useEffect } from 'react';
import type { ClientEvent } from '@razor/contracts';

export function useSseStream() {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const streamUrl = `${baseUrl}/api/events/stream`;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        setError('SSE stream interrupted. Retrying...');
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as ClientEvent;
          setEvents((prev) => [parsed, ...prev.slice(0, 199)]);
        } catch {
          // Keep-alive or ping message
        }
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initialize EventSource');
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return { isConnected, events, error };
}
