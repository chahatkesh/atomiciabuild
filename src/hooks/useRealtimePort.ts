"use client";

import { useCallback, useEffect, useRef } from "react";

export interface RealtimePort {
  subscribe(onTick: () => void): () => void;
}

export function usePollingRefresh(intervalMs: number, onTick: () => void): void {
  const saved = useRef(onTick);

  useEffect(() => {
    saved.current = onTick;
  }, [onTick]);

  useEffect(() => {
    const id = window.setInterval(() => saved.current(), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}

export function useRealtimePort(port: RealtimePort, onTick: () => void): void {
  const stableTick = useCallback(() => onTick(), [onTick]);

  useEffect(() => port.subscribe(stableTick), [port, stableTick]);
}
