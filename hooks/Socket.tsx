import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

// -----------------------------------------------------------------------------
// useMarketWebSocket
// -----------------------------------------------------------------------------
/**
 * Reusable WebSocket hook for real-time market data (indices, stocks, portfolio, etc.)
 *
 * @param {Object} options
 * @param {string[]} options.symbols          - Array of symbols to subscribe to
 * @param {string} [options.url]              - WebSocket URL (default from your env)
 * @param {function} [options.onTick]         - Optional: custom handler for every tick
 * @param {boolean} [options.autoReconnect=true] - Should try to reconnect on close/error
 * @param {number} [options.reconnectDelay=5000] - Delay before reconnect (ms)
 *
 * @returns {{
 *   isConnected: boolean,
 *   realtimeData: Record<string, {c: number, pch: number, ch: number, ldcp?: number, v?: number, isPositive: boolean, timestamp: number}>,
 *   error: string | null,
 *   priceAnims: Record<string, Animated.Value>,
 *   changeAnims: Record<string, Animated.Value>,
 *   pulsePrice: (symbol: string) => void,
 *   pulseChange: (symbol: string) => void
 * }}
 */
export default function useMarketWebSocket({
  symbols = [],
  url = 'wss://ielapis.u2ventures.io/ws/market/feed/', // ← change to your real URL
  onTick = null,
  autoReconnect = true,
  reconnectDelay = 5000,
} = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeData, setRealtimeData] = useState({});
  const [error, setError] = useState(null);

  // Animation refs — one per symbol
  const priceAnims = useRef({});
  const changeAnims = useRef({});

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Initialize / clean up animation values when symbols change
  useEffect(() => {
    symbols.forEach((symbol) => {
      if (!priceAnims.current[symbol]) {
        priceAnims.current[symbol] = new Animated.Value(1);
        changeAnims.current[symbol] = new Animated.Value(1);
      }
    });

    // Optional: clean up unused animations (if symbols removed)
    Object.keys(priceAnims.current).forEach((key) => {
      if (!symbols.includes(key)) {
        delete priceAnims.current[key];
        delete changeAnims.current[key];
      }
    });
  }, [symbols]);

  const pulsePrice = useCallback((symbol) => {
    const anim = priceAnims.current[symbol];
    if (!anim) return;

    Animated.sequence([
      Animated.timing(anim, { toValue: 1.12, duration: 140, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const pulseChange = useCallback((symbol) => {
    const anim = changeAnims.current[symbol];
    if (!anim) return;

    Animated.sequence([
      Animated.timing(anim, { toValue: 1.08, duration: 160, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const connect = useCallback(() => {
    if (!symbols?.length) return;

    console.log(`[WS] Connecting → ${url} | symbols: ${symbols.length}`);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      setIsConnected(true);
      setError(null);

      const msg = { type: 'subscribe', symbols };
      ws.send(JSON.stringify(msg));
      console.log('[WS] Subscription sent:', symbols);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Your actual message format
        if (
          msg.message === 'Received tick' &&
          msg.data?.type === 'tick' &&
          msg.data?.data?.s
        ) {
          const tick = msg.data.data;
          const symbol = tick.s;

          // Only process symbols we're interested in
          if (!symbols.includes(symbol)) return;

          const newPchPercent = Number(tick.pch || 0) * 100;

          const update = {
            c: Number(tick.c || 0),
            pch: newPchPercent,
            ch: Number(tick.ch || 0),
            ldcp: Number(tick.ldcp || 0),
            v: Number(tick.v || 0),
            isPositive: (tick.pch || 0) >= 0,
            timestamp: tick.t || Date.now(),
          };

          // Only update if meaningful change
          setRealtimeData((prev) => {
            const existing = prev[symbol] || {};
            if (
              Math.abs(existing.c - update.c) < 0.01 &&
              Math.abs(existing.pch - update.pch) < 0.01
            ) {
              return prev;
            }

            // Trigger animation
            pulsePrice(symbol);
            pulseChange(symbol);

            return {
              ...prev,
              [symbol]: update,
            };
          });

          // Optional custom handler
          if (onTick) {
            onTick(symbol, update);
          }
        }
      } catch (err) {
        console.error('[WS] Parse error:', err, event.data);
      }
    };

    ws.onerror = (e) => {
      console.error('[WS] Error:', e);
      setError('WebSocket connection failed');
      setIsConnected(false);
    };

    ws.onclose = (e) => {
      console.log(`[WS] Closed → code: ${e.code}, reason: ${e.reason || 'none'}`);
      setIsConnected(false);

      if (autoReconnect) {
        console.log(`[WS] Reconnecting in ${reconnectDelay}ms...`);
        reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
      }
    };
  }, [symbols, url, autoReconnect, reconnectDelay, onTick, pulsePrice, pulseChange]);

  useEffect(() => {
    if (symbols?.length > 0) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, symbols]);

  return {
    isConnected,
    realtimeData,           // symbol → latest tick data
    error,
    priceAnims: priceAnims.current,
    changeAnims: changeAnims.current,
    pulsePrice,
    pulseChange,
  };
}