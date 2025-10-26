const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const loginButton = document.getElementById('loginButton');

async function getCsrfToken() {
  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });
    const data = await response.json();
    return data.data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  errorMessage.classList.remove('show');
  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';

  try {
    const csrfToken = await getCsrfToken();
    
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      window.location.href = '/admin';
    } else {
      errorMessage.textContent = data.error || 'Login failed. Please try again.';
      errorMessage.classList.add('show');
    }
  } catch (error) {
    console.error('Login error:', error);
    errorMessage.textContent = 'An error occurred. Please try again.';
    errorMessage.classList.add('show');
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Login';
  }
});

async function checkSession() {
  try {
    const response = await fetch('/api/admin/check-session', { credentials: 'include' });
    
    if (!response.ok) {
      console.error('Session check failed with status:', response.status);
      document.body.classList.add('loaded');
      return;
    }
    
    const responseData = await response.json();
    const data = responseData.data || {};
    
    if (data.authenticated) {
      window.location.href = '/admin';
    } else {
      document.body.classList.add('loaded');
    }
  } catch (error) {
    console.error('Session check error:', error);
    document.body.classList.add('loaded');
  }
}

checkSession();
