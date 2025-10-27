    async function checkAuth() {
      try {
        const response = await fetch('/api/admin/check-session', { credentials: 'include' });
        
        if (!response.ok) {
          console.error('Session check failed with status:', response.status);
          window.location.href = '/admin-login.html';
          return false;
        }
        
        const responseData = await response.json();
        const data = responseData.data || {};

        if (!data.authenticated) {
          window.location.href = '/admin-login.html';
          return false;
        }
        return true;
      } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/admin-login.html';
        return false;
      }
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const validationErrors = document.getElementById('validationErrors');
    const errorList = document.getElementById('errorList');
    const submitButton = document.getElementById('submitButton');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    const validatePasswordRequirements = setupPasswordValidation(
      newPasswordInput,
      confirmPasswordInput
    );

    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      errorMessage.classList.remove('show');
      successMessage.classList.remove('show');
      validationErrors.classList.remove('show');
      submitButton.disabled = true;
      submitButton.textContent = 'Changing Password...';

      try {
        const csrfToken = await getCsrfToken();
        
        const response = await fetch('/api/admin/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
          },
          credentials: 'include',
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        });

        const data = await response.json();

        if (response.ok) {
          successMessage.textContent = data.message || 'Password changed successfully!';
          successMessage.classList.add('show');
          changePasswordForm.reset();
          
          setTimeout(() => {
            window.location.href = '/admin';
          }, 2000);
        } else {
          if (data.errors && Array.isArray(data.errors)) {
            errorList.innerHTML = '';
            data.errors.forEach(err => {
              const li = document.createElement('li');
              li.textContent = err.msg;
              errorList.appendChild(li);
            });
            validationErrors.classList.add('show');
          } else {
            errorMessage.textContent = data.error || 'Failed to change password. Please try again.';
            errorMessage.classList.add('show');
          }
        }
      } catch (error) {
        console.error('Change password error:', error);
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.classList.add('show');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Change Password';
      }
    });

    checkAuth();
