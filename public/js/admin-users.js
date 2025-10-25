    async function checkAuth() {
      try {
        const response = await fetch('/api/admin/check-session', { credentials: 'include' });
        const data = await response.json();
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

    async function loadUsers() {
      try {
        const response = await fetch('/api/admin/users', { credentials: 'include' });
        const users = await response.json();
        
        const tbody = document.getElementById('usersTable');
        if (users.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No users found</td></tr>';
          return;
        }

        tbody.innerHTML = users.map(user => {
          let statusClass, statusOptions, statusInfo = '';
          
          if (user.isFrozen) {
            statusClass = 'status-frozen';
            statusOptions = `
              <option value="frozen" selected>🔒 Frozen</option>
              <option value="active">✓ Active</option>
              <option value="inactive">⊗ Inactive</option>
            `;
            statusInfo = `<small class="status-info">${user.failedLoginAttempts || 0} failed login attempts</small>`;
          } else if (user.isActive) {
            statusClass = 'status-active';
            statusOptions = `
              <option value="active" selected>✓ Active</option>
              <option value="inactive">⊗ Inactive</option>
            `;
          } else {
            statusClass = 'status-inactive';
            statusOptions = `
              <option value="inactive" selected>⊗ Inactive</option>
              <option value="active">✓ Active</option>
            `;
          }

          return `
          <tr>
            <td><strong>${user.firstName} ${user.lastName}</strong></td>
            <td>${user.email}</td>
            <td><span class="badge badge-${user.role.replace('-', '')}">${user.role}</span></td>
            <td>
              <select class="status-select ${statusClass}" onchange="handleStatusChange(${user.id}, this.value, ${user.isFrozen})">
                ${statusOptions}
              </select>
              ${statusInfo}
            </td>
            <td>${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-primary btn-sm" onclick='editUser(${JSON.stringify(user)})'>Edit</button>
              </div>
            </td>
          </tr>
        `;
        }).join('');
      } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Failed to load users', 'error');
      }
    }

    function openCreateModal() {
      document.getElementById('createModal').classList.add('active');
    }

    function closeCreateModal() {
      document.getElementById('createModal').classList.remove('active');
      document.getElementById('createUserForm').reset();
    }

    function editUser(user) {
      document.getElementById('editUserId').value = user.id;
      document.getElementById('editFirstName').value = user.firstName;
      document.getElementById('editLastName').value = user.lastName;
      document.getElementById('editEmail').value = user.email;
      document.getElementById('editRole').value = user.role;
      
      document.getElementById('editModal').classList.add('active');
    }

    function closeEditModal() {
      document.getElementById('editModal').classList.remove('active');
      document.getElementById('editUserForm').reset();
    }

    async function createUser(event) {
      event.preventDefault();
      
      const firstName = document.getElementById('firstName').value;
      const lastName = document.getElementById('lastName').value;
      const email = document.getElementById('email').value;
      const role = document.getElementById('role').value;

      try {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, role })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create user');
        }

        showAlert('User created successfully! An onboarding email has been sent with setup instructions.', 'success');
        closeCreateModal();
        loadUsers();
      } catch (error) {
        console.error('Error creating user:', error);
        showAlert(error.message, 'error');
      }
    }

    async function updateUser(event) {
      event.preventDefault();
      
      const userId = document.getElementById('editUserId').value;
      const firstName = document.getElementById('editFirstName').value;
      const lastName = document.getElementById('editLastName').value;
      const email = document.getElementById('editEmail').value;
      const role = document.getElementById('editRole').value;

      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ firstName, lastName, email, role })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update user');
        }

        showAlert('User updated successfully!', 'success');
        closeEditModal();
        loadUsers();
      } catch (error) {
        console.error('Error updating user:', error);
        showAlert(error.message, 'error');
      }
    }

    function getStatusChangeConfirmation(newStatus, isFrozen) {
      const action = newStatus === 'active' ? 'activate' : 'deactivate';
      
      if (isFrozen) {
        return `This account is frozen. Do you want to unfreeze and ${action} it? This will reset failed login attempts.`;
      }
      
      return `Are you sure you want to ${action} this user?`;
    }

    async function handleStatusChange(userId, newStatus, isFrozen) {
      // Handle frozen status selection - just reset dropdown
      if (newStatus === 'frozen') {
        await loadUsers();
        return;
      }

      // Get appropriate confirmation message
      const confirmMessage = getStatusChangeConfirmation(newStatus, isFrozen);
      if (!confirm(confirmMessage)) {
        await loadUsers(); // Reset dropdown
        return;
      }

      try {
        // Use atomic endpoint that handles unfreeze + status change together
        const response = await fetch(`/api/admin/users/${userId}/set-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            status: newStatus,
            unfreeze: isFrozen 
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update user status');
        }

        showAlert(data.message || 'User status updated successfully', 'success');
        loadUsers();
      } catch (error) {
        console.error('Error updating user status:', error);
        showAlert(error.message, 'error');
        loadUsers();
      }
    }

    async function unfreezeUser(userId) {
      if (!confirm('Are you sure you want to unfreeze this account? This will reset failed login attempts and allow the user to login.')) {
        return;
      }

      try {
        const response = await fetch(`/api/admin/users/${userId}/unfreeze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to unfreeze account');
        }

        showAlert('Account unfrozen successfully! User can now login.', 'success');
        loadUsers();
      } catch (error) {
        console.error('Error unfreezing user:', error);
        showAlert(error.message, 'error');
      }
    }

    function showAlert(message, type) {
      const container = document.getElementById('alertContainer');
      container.textContent = '';
      
      const alertDiv = document.createElement('div');
      alertDiv.className = `alert alert-${type}`;
      alertDiv.textContent = message;
      
      container.appendChild(alertDiv);
      
      setTimeout(() => {
        container.textContent = '';
      }, 5000);
    }

    async function init() {
      const authenticated = await checkAuth();
      if (authenticated) {
        await loadUsers();
      }
    }

    init();
