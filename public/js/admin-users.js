async function checkAuth() {
  try {
    const response = await fetch("/api/admin/check-session", {
      credentials: "include",
    });

    if (!response.ok) {
      console.error("Session check failed with status:", response.status);
      window.location.href = "/admin-login.html";
      return false;
    }

    const responseData = await response.json();
    const data = responseData.data || {};

    if (!data.authenticated) {
      window.location.href = "/admin-login.html";
      return false;
    }
    return true;
  } catch (error) {
    console.error("Auth check error:", error);
    window.location.href = "/admin-login.html";
    return false;
  }
}

async function loadUsers() {
  try {
    const response = await fetch("/api/admin/users", {
      credentials: "include",
    });
    const responseData = await response.json();
    const users = responseData.data || responseData;

    const tbody = document.getElementById("usersTable");
    if (users.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center; color: #999;">No users found</td></tr>';
      return;
    }

    // Helper to escape HTML
    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    tbody.innerHTML = users
      .map((user) => {
        let statusClass,
          statusOptions,
          statusInfo = "";

        if (user.isFrozen) {
          statusClass = "status-frozen";
          statusOptions = `
              <option value="frozen" selected>🔒 Frozen</option>
              <option value="active">✓ Active</option>
              <option value="inactive">⊗ Inactive</option>
            `;
          statusInfo = `<small class="status-info">${user.failedLoginAttempts || 0} failed login attempts</small>`;
        } else if (user.isActive) {
          statusClass = "status-active";
          statusOptions = `
              <option value="active" selected>✓ Active</option>
              <option value="inactive">⊗ Inactive</option>
            `;
        } else {
          statusClass = "status-inactive";
          statusOptions = `
              <option value="inactive" selected>⊗ Inactive</option>
              <option value="active">✓ Active</option>
            `;
        }

        return `
          <tr>
            <td><strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong></td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="badge badge-${escapeHtml(user.role).replace(" ", "-")}">${escapeHtml(user.role)}</span></td>
            <td>
              <select class="status-select ${statusClass}" data-user-id="${user.id}" data-is-frozen="${user.isFrozen}">
                ${statusOptions}
              </select>
              ${statusInfo}
            </td>
            <td>${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-primary btn-sm" data-user='${escapeHtml(JSON.stringify(user))}'>Edit</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    // Attach event listeners after rendering
    tbody.querySelectorAll("select.status-select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const userID = parseInt(e.target.dataset.userId);
        const isFrozen = e.target.dataset.isFrozen === "true";
        handleStatusChange(userID, e.target.value, isFrozen);
      });
    });

    tbody.querySelectorAll("button[data-user]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const user = JSON.parse(e.target.dataset.user);
        editUser(user);
      });
    });
  } catch (error) {
    console.error("Error loading users:", error);
    showAlert("Failed to load users", "error");
  }
}

function openCreateModal() {
  document.getElementById("createModal").classList.add("active");
}

function closeCreateModal() {
  document.getElementById("createModal").classList.remove("active");
  document.getElementById("createUserForm").reset();
}

function editUser(user) {
  document.getElementById("editUserId").value = user.id;
  document.getElementById("editFirstName").value = user.firstName;
  document.getElementById("editLastName").value = user.lastName;
  document.getElementById("editEmail").value = user.email;
  document.getElementById("editRole").value = user.role;

  document.getElementById("editModal").classList.add("active");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("active");
  document.getElementById("editUserForm").reset();
}

// Get CSRF token from server (consistent with other modules)
async function getCsrfToken() {
  const response = await fetch("/api/csrf-token", { credentials: "include" });
  if (!response.ok) {
    throw new Error(`CSRF token fetch failed with status ${response.status} ${response.statusText}`);
  }
  const data = await response.json().catch(() => ({}));
  if (!data?.data?.csrfToken)
    throw new Error("Invalid CSRF token response");
    return data.data.csrfToken;
}

async function createUser(event) {
  event.preventDefault();

  const firstName = document.getElementById("firstName").value;
  const lastName = document.getElementById("lastName").value;
  const email = document.getElementById("email").value;
  const role = document.getElementById("role").value;

  try {
    const csrfToken = await getCsrfToken();
    const response = await fetch("/api/admin/users", {
      method: "POST",
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ firstName, lastName, email, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create user");
    }

    showAlert(
      "User created successfully! An onboarding email has been sent with setup instructions.",
      "success",
    );
    closeCreateModal();
    loadUsers();
  } catch (error) {
    console.error("Error creating user:", error);
    showAlert(error.message, "error");
  }
}

async function updateUser(event) {
  event.preventDefault();

  const userId = document.getElementById("editUserId").value;
  const firstName = document.getElementById("editFirstName").value;
  const lastName = document.getElementById("editLastName").value;
  const email = document.getElementById("editEmail").value;
  const role = document.getElementById("editRole").value;

  try {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify({ firstName, lastName, email, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to update user");
    }

    showAlert("User updated successfully!", "success");
    closeEditModal();
    loadUsers();
  } catch (error) {
    console.error("Error updating user:", error);
    showAlert(error.message, "error");
  }
}

function getStatusChangeConfirmation(newStatus, isFrozen) {
  const action = newStatus === "active" ? "activate" : "deactivate";

  if (isFrozen) {
    return `This account is frozen. Do you want to unfreeze and ${action} it? This will reset failed login attempts.`;
  }

  return `Are you sure you want to ${action} this user?`;
}

async function handleStatusChange(userId, newStatus, isFrozen) {
  // Handle frozen status selection - just reset dropdown
  if (newStatus === "frozen") {
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
    const csrfToken = await getCsrfToken();
    
    if (!csrfToken) {
      console.error("CSRF token is missing - aborting request");
      showAlert("Security token missing. Please refresh the page and try again.", "error");
      await loadUsers();
      return;
    }
    
    // Use atomic endpoint that handles unfreeze + status change together
    const response = await fetch(`/api/admin/users/${userId}/set-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({
        isActive: newStatus === "active",
        shouldUnfreeze: isFrozen,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to update user status");
    }

    showAlert(data.message || "User status updated successfully", "success");
    loadUsers();
  } catch (error) {
    console.error("Error updating user status:", error);
    showAlert(error.message, "error");
    loadUsers();
  }
}

async function unfreezeUser(userId) {
  if (
    !confirm(
      "Are you sure you want to unfreeze this account? This will reset failed login attempts and allow the user to login.",
    )
  ) {
    return;
  }

  try {
    const csrfToken = await getCsrfToken();
    
    if (!csrfToken) {
      console.error("CSRF token is missing - aborting request");
      showAlert("Security token missing. Please refresh the page and try again.", "error");
      return;
    }
    
    const response = await fetch(`/api/admin/users/${userId}/unfreeze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to unfreeze account");
    }

    showAlert("Account unfrozen successfully! User can now login.", "success");
    loadUsers();
  } catch (error) {
    console.error("Error unfreezing user:", error);
    showAlert(error.message, "error");
  }
}

function showAlert(message, type) {
  const container = document.getElementById("alertContainer");
  container.textContent = "";

  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;

  container.appendChild(alertDiv);

  setTimeout(() => {
    container.textContent = "";
  }, 5000);
}

// Make modal functions globally accessible for onclick handlers
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.closeEditModal = closeEditModal;
window.createUser = createUser;
window.updateUser = updateUser;

// Setup all modal-related event listeners
function setupModalEventListeners() {
  // Setup backdrop click handlers
  const createModal = document.getElementById('createModal');
  const editModal = document.getElementById('editModal');
  
  if (createModal) {
    createModal.addEventListener('click', (e) => {
      if (e.target === createModal) {
        closeCreateModal();
      }
    });
  }
  
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) {
        closeEditModal();
      }
    });
  }
  
  // Setup button click handlers
  const createUserBtn = document.getElementById('createUserBtn');
  const createCancelBtn = document.getElementById('createCancelBtn');
  const editCancelBtn = document.getElementById('editCancelBtn');
  
  if (createUserBtn) {
    createUserBtn.addEventListener('click', openCreateModal);
  }
  
  if (createCancelBtn) {
    createCancelBtn.addEventListener('click', closeCreateModal);
  }
  
  if (editCancelBtn) {
    editCancelBtn.addEventListener('click', closeEditModal);
  }
}

async function init() {
  const authenticated = await checkAuth();
  if (authenticated) {
    await loadUsers();
    setupModalEventListeners();
  }
}

init();
