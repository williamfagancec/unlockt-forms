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
        const response = await fetch('/api/quote-slip-submissions', { credentials: 'include' });
        const submissions = await response.json();

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

    function formatCurrency(value) {
      if (!value) return 'N/A';
      return '$' + parseInt(value).toLocaleString();
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
          <td>${submission.strataPlanNumber || 'N/A'}</td>
          <td>${submission.strataManagementName || 'N/A'}</td>
          <td>${submission.currentInsurer || 'N/A'}</td>
          <td>${submission.address || 'N/A'}</td>
          <td>${formatCurrency(submission.requestedSumInsured)}</td>
        `;

        tbody.appendChild(row);
      });
    }

    function filterSubmissions() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();

      filteredSubmissions = allSubmissions.filter(submission => {
        return (
          (submission.strataPlanNumber || '').toLowerCase().includes(searchTerm) ||
          (submission.strataManagementName || '').toLowerCase().includes(searchTerm) ||
          (submission.currentInsurer || '').toLowerCase().includes(searchTerm) ||
          (submission.address || '').toLowerCase().includes(searchTerm) ||
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
      window.location.href = `/admin/quote-slip/${id}`;
    }

    async function exportSubmissions() {
      try {
        window.location.href = '/api/export/quote-slip';
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
