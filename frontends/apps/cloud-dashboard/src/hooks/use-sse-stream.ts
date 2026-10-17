'use client';

import { useState, useEffect } from 'react';
import type { ClientEvent } from '@razor/contracts';

const SSE_EVENT_TYPES = [
  'message',
  'run_status',
  'command_progress',
  'command_completed',
  'engine_heartbeat',
  'engine_status',
  'equity_tick',
  'telemetry',
] as const;

export function useSseStream(instanceId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const streamUrl = instanceId
      ? `${baseUrl}/api/events/stream?instanceId=${encodeURIComponent(instanceId)}`
      : `${baseUrl}/api/events/stream`;

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

      const handleEvent = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data) as ClientEvent;
          setEvents((prev) => [parsed, ...prev.slice(0, 199)]);
        } catch {
          // Keep-alive or ping message
        }
      };

      for (const eventType of SSE_EVENT_TYPES) {
        eventSource.addEventListener(eventType, handleEvent);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initialize EventSource');
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [instanceId]);

  return { isConnected, events, error };
}
