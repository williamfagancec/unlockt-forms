    let token = null;
    let userData = null;

    async function getCsrfToken() {
      try {
        const response = await fetch('/api/csrf-token', { credentials: 'include' });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.data || !data.data.csrfToken) {
          throw new Error(`CSRF token field missing in response. Received: ${JSON.stringify(data)}`);
        }
        
        return data.data.csrfToken;
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
        throw error;
      }
    }

    async function verifyToken() {
      const params = new URLSearchParams(window.location.search);
      token = params.get('token');

      if (!token) {
        showExpiredState();
        return;
      }

      try {
        const response = await fetch(`/api/verify-onboarding-token?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
          showExpiredState();
          return;
        }

        userData = data.user;
        document.getElementById('displayName').textContent = `${userData.firstName} ${userData.lastName}`;
        document.getElementById('displayEmail').textContent = userData.email;
        document.getElementById('displayRole').textContent = userData.role;

        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('setupForm').style.display = 'block';
      } catch (error) {
        console.error('Error verifying token:', error);
        showExpiredState();
      }
    }

    function showExpiredState() {
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('expiredState').style.display = 'block';
    }

    const sharedValidatePassword = window.validatePassword;
    
    function validatePasswordWrapper() {
      const passwordInput = document.getElementById('password');
      const confirmPasswordInput = document.getElementById('confirmPassword');
      const submitBtn = document.getElementById('submitBtn');
      
      const isValid = sharedValidatePassword(passwordInput, confirmPasswordInput);
      
      if (submitBtn) {
        submitBtn.disabled = !isValid;
      }
      
      return isValid;
    }
    
    window.validatePassword = validatePasswordWrapper;

    async function setupPassword(event) {
      event.preventDefault();
      
      const password = document.getElementById('password').value;
      const submitBtn = document.getElementById('submitBtn');
      const alertContainer = document.getElementById('alertContainer');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Setting up your account...';

      try {
        const csrfToken = await getCsrfToken();
        
        const response = await fetch('/api/complete-onboarding', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
          },
          credentials: 'include',
          body: JSON.stringify({ token, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to setup password');
        }

        alertContainer.innerHTML = '<div class="alert alert-success">✓ Account setup complete! Redirecting to login...</div>';
        
        setTimeout(() => {
          window.location.href = '/admin-login.html';
        }, 2000);
      } catch (error) {
        console.error('Error setting up password:', error);
        alertContainer.innerHTML = '<div class="alert alert-error"></div>';
        alertContainer.querySelector('.alert-error').textContent = error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete Setup';
      }
    }

    verifyToken();
