function getCandidates(endpoint: string): string[] {
  const candidates: string[] = [];
  
  if (typeof window !== 'undefined') {
    // 1. Same-origin Next.js rewrite proxy (avoids CORS and browser shield issues)
    candidates.push(`/api/v1${endpoint}`);
    // 2. Direct matching host
    const host = window.location.hostname || 'localhost';
    candidates.push(`http://${host}:8000/api/v1${endpoint}`);
  }
  
  // 3. Explicit or environment URL
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
  candidates.push(`${envUrl}${endpoint}`);
  candidates.push(`http://127.0.0.1:8000/api/v1${endpoint}`);
  candidates.push(`http://localhost:8000/api/v1${endpoint}`);

  // Deduplicate preserving order
  return Array.from(new Set(candidates));
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('krishi_auth_token') : null);
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const urlsToTry = getCandidates(endpoint);
  let lastError: unknown = null;
  let response: Response | null = null;

  for (const url of urlsToTry) {
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
      if (response.ok || response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404 || response.status === 409 || response.status === 422 || response.status === 500) {
        // Connected to server successfully (even if HTTP error response)
        break;
      }
    } catch (err) {
      lastError = err;
      // Continue to next fallback candidate
    }
  }

  if (!response) {
    throw lastError || new Error('Network request failed across all connection endpoints');
  }

  if (!response.ok) {
    let errorDetail = 'API Request failed';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
