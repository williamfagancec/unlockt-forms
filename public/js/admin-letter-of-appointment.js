    let allSubmissions = [];
    let filteredSubmissions = [];

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

    async function loadSubmissions() {
      try {
        const response = await fetch('/api/submissions', { credentials: 'include' });
        const responseData = await response.json();
        const submissions = responseData.data || responseData;

        allSubmissions = submissions;
        filteredSubmissions = submissions;

        renderSubmissions();

        document.getElementById('loading').style.display = 'none';
        
        if (submissions.length === 0) {
          document.getElementById('emptyState').style.display = 'block';
        } else {
          document.getElementById('submissionsContent').style.display = 'block';
        }
      } catch (error) {
        console.error('Error loading submissions:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
      }
    }

    function renderSubmissions() {
      const tbody = document.getElementById('submissionsTableBody');
      tbody.innerHTML = '';

      filteredSubmissions.forEach(submission => {
        const row = document.createElement('tr');
        row.onclick = () => viewSubmission(submission.id);
        
        const submittedDate = new Date(submission.submittedAt);
        const formattedDate = submittedDate.toLocaleDateString() + ' ' + submittedDate.toLocaleTimeString();

        row.innerHTML = `
          <td>#${submission.id}</td>
          <td>${formattedDate}</td>
          <td>${submission.strataManagement || 'N/A'}</td>
          <td>${submission.strataPlanNumber || 'N/A'}</td>
          <td>${submission.streetAddress || 'N/A'}</td>
          <td>${submission.city || 'N/A'}</td>
          <td>${submission.state || 'N/A'}</td>
        `;

        tbody.appendChild(row);
      });
    }

    function filterSubmissions() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();

      filteredSubmissions = allSubmissions.filter(submission => {
        return (
          (submission.strataManagement || '').toLowerCase().includes(searchTerm) ||
          (submission.strataPlanNumber || '').toLowerCase().includes(searchTerm) ||
          (submission.streetAddress || '').toLowerCase().includes(searchTerm) ||
          (submission.city || '').toLowerCase().includes(searchTerm) ||
          submission.id.toString().includes(searchTerm)
        );
      });

      renderSubmissions();

      if (filteredSubmissions.length === 0 && allSubmissions.length > 0) {
        document.getElementById('submissionsContent').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('emptyState').innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <h2>No Results Found</h2>
          <p>Try adjusting your search term.</p>
        `;
      } else if (filteredSubmissions.length > 0) {
        document.getElementById('submissionsContent').style.display = 'block';
        document.getElementById('emptyState').style.display = 'none';
      }
    }

    function viewSubmission(id) {
      window.location.href = `/admin/letter-of-appointment/${id}`;
    }

    async function exportSubmissions() {
      try {
        window.location.href = '/api/export/letter-of-appointment';
      } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export submissions');
      }
    }

    async function init() {
      const authenticated = await checkAuth();
      if (authenticated) {
        await loadSubmissions();
      }
    }

    init();
