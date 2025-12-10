/**
 * Twitch OAuth utilities for user authentication
 * Implements OAuth 2.0 implicit flow for client-side authentication
 */

const STORAGE_KEY = 'twitch_user_token';
const STORAGE_USER_KEY = 'twitch_user_data';

export interface TwitchUserToken {
  accessToken: string;
  expiresAt: number;
  scopes: string[];
}

export interface TwitchUserData {
  id: string;
  login: string;
  displayName: string;
  profileImageUrl: string;
}

/**
 * Generate a random state string for CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store state in sessionStorage for validation after redirect
 */
export function storeState(state: string): void {
  sessionStorage.setItem('twitch_oauth_state', state);
}

/**
 * Validate state matches the stored value
 */
export function validateState(state: string): boolean {
  const storedState = sessionStorage.getItem('twitch_oauth_state');
  sessionStorage.removeItem('twitch_oauth_state');
  return storedState === state;
}

/**
 * Build Twitch OAuth authorization URL
 */
export function buildAuthUrl(clientId: string, redirectUri: string, scopes: string[]): string {
  const state = generateState();
  storeState(state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: scopes.join(' '),
    state: state,
  });

  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

/**
 * Parse OAuth response from URL fragment
 */
export function parseAuthResponse(): { accessToken: string; scopes: string[]; expiresIn: number; state: string } | null {
  const hash = window.location.hash.substring(1);
  console.log('Parsing hash:', hash);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const scopesStr = params.get('scope');
  const expiresIn = params.get('expires_in');
  const state = params.get('state');

  console.log('Parsed OAuth params:', { accessToken: accessToken ? 'present' : 'missing', scopesStr, expiresIn, state: state ? 'present' : 'missing' });

  if (!accessToken || !state) return null;

  const scopes = scopesStr ? scopesStr.split(' ') : [];

  // Twitch implicit flow doesn't include expires_in in the response
  // Default to 4 hours (14400 seconds) which is the standard for Twitch user tokens
  const expiresInSeconds = expiresIn ? parseInt(expiresIn) : 14400;

  return {
    accessToken,
    scopes,
    expiresIn: expiresInSeconds,
    state,
  };
}

/**
 * Save user token to localStorage
 */
export function saveUserToken(token: TwitchUserToken): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
}

/**
 * Get user token from localStorage
 */
export function getUserToken(): TwitchUserToken | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const token = JSON.parse(stored) as TwitchUserToken;
    
    // Check if token is expired
    if (Date.now() >= token.expiresAt) {
      clearUserToken();
      return null;
    }

    return token;
  } catch {
    return null;
  }
}

/**
 * Clear user token from localStorage
 */
export function clearUserToken(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}

/**
 * Save user data to localStorage
 */
export function saveUserData(userData: TwitchUserData): void {
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
}

/**
 * Get user data from localStorage
 */
export function getUserData(): TwitchUserData | null {
  const stored = localStorage.getItem(STORAGE_USER_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as TwitchUserData;
  } catch {
    return null;
  }
}

/**
 * Fetch user information from Twitch API
 */
export async function fetchUserInfo(accessToken: string, clientId: string): Promise<TwitchUserData | null> {
  try {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-ID': clientId,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch user info:', response.statusText);
      return null;
    }

    const data = await response.json();
    const user = data.data?.[0];

    if (!user) return null;

    return {
      id: user.id,
      login: user.login,
      displayName: user.display_name,
      profileImageUrl: user.profile_image_url,
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}

/**
 * Validate a token with Twitch API
 */
export async function validateToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `OAuth ${accessToken}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Revoke a Twitch OAuth token
 */
export async function revokeToken(accessToken: string, clientId: string): Promise<boolean> {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        token: accessToken,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
