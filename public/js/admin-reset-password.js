    let resetToken = null;

    async function validateToken() {
      const urlParams = new URLSearchParams(window.location.search);
      resetToken = urlParams.get('token');

      if (!resetToken) {
        showInvalidLink('No reset token provided. Please check your email for the correct link.');
        return;
      }

      try {
        const response = await fetch(`/api/admin/validate-reset-token?token=${encodeURIComponent(resetToken)}`);
        const data = await response.json();

        if (data.valid) {
          document.getElementById('userInfo').textContent = `Resetting password for: ${data.userFirstName} ${data.userLastName} (${data.userEmail})`;
          document.getElementById('loading').style.display = 'none';
          document.getElementById('resetForm').style.display = 'block';
        } else {
          showInvalidLink(data.error || 'This reset link is invalid or has expired.');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        showInvalidLink('Failed to validate reset link. Please try again.');
      }
    }

    function showInvalidLink(message) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('invalidMessage').textContent = message;
      document.getElementById('invalidLink').style.display = 'block';
    }

    const resetPasswordForm = document.getElementById('resetPasswordForm');
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

    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      errorMessage.classList.remove('show');
      successMessage.classList.remove('show');
      validationErrors.classList.remove('show');
      submitButton.disabled = true;
      submitButton.textContent = 'Resetting Password...';

      try {
        const csrfToken = await getCsrfToken();
        
        const response = await fetch('/api/admin/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
          },
          body: JSON.stringify({ 
            token: resetToken,
            newPassword, 
            confirmPassword 
          })
        });

        const data = await response.json();

        if (response.ok) {
          successMessage.textContent = data.message || 'Password reset successfully!';
          successMessage.classList.add('show');
          resetPasswordForm.reset();
          document.getElementById('resetForm').querySelector('.password-requirements').style.display = 'none';
          
          setTimeout(() => {
            window.location.href = '/admin-login.html';
          }, 3000);
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
            errorMessage.textContent = data.error || 'Failed to reset password. Please try again.';
            errorMessage.classList.add('show');
          }
        }
      } catch (error) {
        console.error('Reset password error:', error);
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.classList.add('show');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Reset Password';
      }
    });

    validateToken();
