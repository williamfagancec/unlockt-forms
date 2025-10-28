/**
 * Centralized CSRF token management utility
 * Provides consistent error handling and response validation across all modules
 */

async function getCsrfToken() {
  try {
    const response = await fetch('/api/csrf-token', { 
      credentials: 'include',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`CSRF token fetch failed with status ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json().catch(() => {
      throw new Error('Invalid JSON response from CSRF endpoint');
    });
    
    if (!data?.data?.csrfToken) {
      throw new Error('CSRF token missing in response');
    }
    
    return data.data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Helper function to make authenticated requests with CSRF protection
 * @param {string} url - The API endpoint
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>} - The fetch response
 */
async function fetchWithCsrf(url, options = {}) {
  const csrfToken = await getCsrfToken();
  
  const headers = {
    ...options.headers,
    'x-csrf-token': csrfToken
  };
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
}
