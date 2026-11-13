import { useState, useEffect } from 'react';

/**
 * Single source of truth for Server Reachability / Demo Mode (Module 51 Part 0)
 * Tiny state: { mode: 'unknown' | 'server' | 'demo' }
 * No component keeps its own copy or its own probe.
 */
let state = {
  mode: 'unknown'
};

const listeners = new Set();
let probeFn = null;

export function getMode() {
  return state.mode;
}

/**
 * Internal setter called by apiRequest in src/services/api.js:
 * The FIRST request whose fetch resolves with any HTTP response sets mode 'server'.
 * The FIRST whose fetch rejects with a network error sets mode 'demo'.
 * Once set for the page load it does not flip back and forth per request.
 */
export function setServerMode(newMode) {
  if (state.mode !== 'unknown') {
    // Locked for page load
    return state.mode;
  }
  if (newMode !== 'server' && newMode !== 'demo') {
    return state.mode;
  }
  state.mode = newMode;
  listeners.forEach((fn) => {
    try {
      fn(state.mode);
    } catch (e) {
      console.error('serverMode subscriber error', e);
    }
  });
  return state.mode;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function registerReachabilityProbe(fn) {
  probeFn = fn;
}

export function probeReachability() {
  if (state.mode !== 'unknown') return Promise.resolve(state.mode);
  if (typeof probeFn === 'function') {
    return probeFn();
  }
  return Promise.resolve(state.mode);
}

/**
 * Reset function for unit tests
 */
export function _resetModeForTests(mode = 'unknown') {
  state.mode = mode;
  listeners.forEach((fn) => {
    try {
      fn(state.mode);
    } catch {}
  });
}

/**
 * Hook backed by subscription:
 * While mode is 'unknown' (before first request settles), mode-dependent banners/panels render nothing.
 */
export function useServerMode() {
  const [mode, setModeState] = useState(state.mode);

  useEffect(() => {
    const unsub = subscribe((newMode) => {
      setModeState(newMode);
    });

    if (state.mode === 'unknown') {
      probeReachability().catch(() => {});
    }

    return unsub;
  }, []);

  return {
    mode,
    isDemo: mode === 'demo',
    isServer: mode === 'server',
    isUnknown: mode === 'unknown'
  };
}

export default {
  getMode,
  setServerMode,
  subscribe,
  useServerMode,
  probeReachability,
  registerReachabilityProbe,
  _resetModeForTests
};
