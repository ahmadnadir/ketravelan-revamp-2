type RequestErrorKind = 'network' | 'timeout' | 'auth' | 'rate_limit' | 'server' | 'unknown';

type ErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
};

export interface RequestErrorFeedback {
  kind: RequestErrorKind;
  title: string;
  description: string;
  retryable: boolean;
}

function asErrorLike(error: unknown): ErrorLike {
  if (!error || typeof error !== 'object') {
    return { message: String(error ?? '') };
  }
  return error as ErrorLike;
}

export function classifyRequestError(error: unknown): RequestErrorFeedback {
  const err = asErrorLike(error);
  const rawMessage = String(err.message || '').toLowerCase();
  const rawCode = String(err.code || '').toLowerCase();
  const status = typeof err.status === 'number' ? err.status : undefined;
  const name = String(err.name || '').toLowerCase();

  const isTimeout =
    name === 'aborterror' ||
    rawMessage.includes('timeout') ||
    rawMessage.includes('timed out') ||
    rawMessage.includes('etimedout');

  if (isTimeout) {
    return {
      kind: 'timeout',
      title: 'Request timed out',
      description: 'The server took too long to respond. Please try again.',
      retryable: true,
    };
  }

  const isAuth =
    status === 401 ||
    status === 403 ||
    rawCode === 'pgrst301' ||
    rawMessage.includes('not authenticated') ||
    rawMessage.includes('jwt') ||
    rawMessage.includes('token') ||
    rawMessage.includes('session expired') ||
    rawMessage.includes('invalid login');

  if (isAuth) {
    return {
      kind: 'auth',
      title: 'Authentication required',
      description: 'Your session may have expired. Please sign in again.',
      retryable: false,
    };
  }

  const isRateLimited = status === 429 || rawMessage.includes('too many requests');
  if (isRateLimited) {
    return {
      kind: 'rate_limit',
      title: 'Too many requests',
      description: 'Please wait a moment, then try again.',
      retryable: true,
    };
  }

  const isNetwork =
    rawMessage.includes('failed to fetch') ||
    rawMessage.includes('network request failed') ||
    rawMessage.includes('network error') ||
    rawMessage.includes('load failed') ||
    rawMessage.includes('internet connection');

  if (isNetwork) {
    return {
      kind: 'network',
      title: 'Network issue',
      description: 'Please check your connection and try again.',
      retryable: true,
    };
  }

  const isServer = (typeof status === 'number' && status >= 500) || rawMessage.includes('internal server error');
  if (isServer) {
    return {
      kind: 'server',
      title: 'Server unavailable',
      description: 'The service is temporarily unavailable. Please try again shortly.',
      retryable: true,
    };
  }

  return {
    kind: 'unknown',
    title: 'Something went wrong',
    description: 'Please try again.',
    retryable: true,
  };
}

export function getLoadErrorFeedback(entityLabel: string, error: unknown): RequestErrorFeedback {
  const base = classifyRequestError(error);

  if (base.kind === 'auth') {
    return {
      ...base,
      title: `Could not load ${entityLabel}`,
      description: 'Your session may have expired. Please sign in and try again.',
    };
  }

  if (base.kind === 'timeout') {
    return {
      ...base,
      title: `Could not load ${entityLabel}`,
      description: `Loading ${entityLabel} timed out. Please try again.`,
    };
  }

  if (base.kind === 'network') {
    return {
      ...base,
      title: `Could not load ${entityLabel}`,
      description: `Network issue while loading ${entityLabel}. Please retry.`,
    };
  }

  return {
    ...base,
    title: `Could not load ${entityLabel}`,
  };
}