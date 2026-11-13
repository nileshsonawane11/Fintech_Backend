// Console Tracing Utility for FinEdge Bank (Module 50)
// Provides unified form submission, API traffic, and screen data fetching tracing.
// Gated by single DEBUG_TRACE flag.

export let DEBUG_TRACE = true;

export const setDebugTrace = (val) => {
  DEBUG_TRACE = Boolean(val);
};

export const getDebugTrace = () => DEBUG_TRACE;

/**
 * Checks whether an object key represents sensitive credentials that must be masked.
 */
function isCredentialKey(key) {
  const k = String(key).toLowerCase();
  return (
    k.includes('password') ||
    k.includes('otp') ||
    k.includes('pin') ||
    k.includes('secret') ||
    k.includes('cvv') ||
    k.includes('token')
  );
}

/**
 * Masks sensitive values into bullet characters ('••••') matching string length (min 4).
 */
function maskValue(val) {
  if (val === null || val === undefined) return val;
  const str = String(val);
  const count = Math.max(str.length, 4);
  return '•'.repeat(count);
}

/**
 * Recursively sanitizes payloads, masking all credential fields.
 */
export function sanitizePayload(payload) {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload !== 'object') return payload;

  if (Array.isArray(payload)) {
    return payload.map(sanitizePayload);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isCredentialKey(key)) {
      sanitized[key] = maskValue(value);
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Trace Form Submission
 * Formats: [FORM] <FormName> -> expandable console group with sanitized payload.
 */
export function traceForm(formName, payload) {
  if (!DEBUG_TRACE) return;
  const sanitized = sanitizePayload(payload);
  if (typeof console !== 'undefined') {
    if (typeof console.groupCollapsed === 'function') {
      console.groupCollapsed(`[FORM] ${formName}`);
      console.info(sanitized);
      console.groupEnd();
    } else {
      console.info(`[FORM] ${formName}`, sanitized);
    }
  }
}

/**
 * Trace API Request
 * Format: [API →] METHOD /path + request body/params
 */
export function traceRequest(method, path, bodyOrParams) {
  if (!DEBUG_TRACE) return;
  const sanitized = bodyOrParams ? sanitizePayload(bodyOrParams) : null;
  if (typeof console !== 'undefined') {
    if (sanitized && Object.keys(sanitized).length > 0) {
      console.info(`[API →] ${String(method).toUpperCase()} ${path}`, sanitized);
    } else {
      console.info(`[API →] ${String(method).toUpperCase()} ${path}`);
    }
  }
}

/**
 * Trace API Response
 * Format: [API ←] /path · <status> · <what came back>
 * (the data itself for single records; keys + count for lists).
 */
export function traceResponse(path, status, data) {
  if (!DEBUG_TRACE) return;
  if (typeof console === 'undefined') return;

  let whatCameBack;
  if (Array.isArray(data)) {
    const keys = data.length > 0 && typeof data[0] === 'object' && data[0] !== null ? Object.keys(data[0]) : [];
    whatCameBack = { count: data.length, keys };
  } else if (data && typeof data === 'object') {
    // Check if the response wraps a list in common API envelopes (data, accounts, items)
    const arrayKey = Object.keys(data).find((k) => Array.isArray(data[k]));
    if (arrayKey) {
      const arr = data[arrayKey];
      const keys = arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null ? Object.keys(arr[0]) : [];
      whatCameBack = { ...sanitizePayload(data), [arrayKey]: { count: arr.length, keys } };
    } else {
      whatCameBack = sanitizePayload(data);
    }
  } else {
    whatCameBack = data;
  }

  console.info(`[API ←] ${path} · ${status} ·`, whatCameBack);
}

/**
 * Trace API Failure
 * Format: [API ✗] /path · <error>
 */
export function traceFailure(path, error) {
  if (!DEBUG_TRACE) return;
  if (typeof console === 'undefined') return;
  const errMsg = error?.detail || error?.message || error?.code || String(error);
  console.info(`[API ✗] ${path} · ${errMsg}`);
}

/**
 * Trace Screen-Level Data Fetching
 * Format: [DATA] <ScreenName>
 */
export function traceData(screenName, details) {
  if (!DEBUG_TRACE) return;
  if (typeof console === 'undefined') return;
  if (details) {
    console.info(`[DATA] ${screenName}`, details);
  } else {
    console.info(`[DATA] ${screenName}`);
  }
}

/**
 * Wraps a screen's data read flow under a single [DATA] <ScreenName> group.
 */
export async function traceDataScope(screenName, fn) {
  if (!DEBUG_TRACE) return fn();
  if (typeof console !== 'undefined' && typeof console.groupCollapsed === 'function') {
    console.groupCollapsed(`[DATA] ${screenName}`);
    try {
      return await fn();
    } finally {
      console.groupEnd();
    }
  }
  return fn();
}
