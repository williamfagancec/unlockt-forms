    let submissionId = null;

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

    async function loadSubmission() {
      const pathParts = window.location.pathname.split('/');
      submissionId = pathParts[pathParts.length - 1];

      try {
        const response = await fetch(`/api/submissions/${submissionId}`, { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Submission not found');
        }

        const submission = await response.json();
        displaySubmission(submission);

        document.getElementById('loading').style.display = 'none';
        document.getElementById('submissionContent').style.display = 'block';
      } catch (error) {
        console.error('Error loading submission:', error);
        alert('Failed to load submission');
        window.location.href = '/admin/letter-of-appointment';
      }
    }

    function displaySubmission(submission) {
      document.getElementById('submissionId').textContent = submission.id;
      
      const date = new Date(submission.submittedAt);
      document.getElementById('submissionDate').textContent = date.toLocaleString();

      document.getElementById('strataManagement').textContent = submission.strataManagement || 'N/A';
      document.getElementById('strataPlanNumber').textContent = submission.strataPlanNumber || 'N/A';
      
      document.getElementById('streetAddress').textContent = submission.streetAddress || 'N/A';
      document.getElementById('streetAddressLine2').textContent = submission.streetAddressLine2 || 'N/A';
      document.getElementById('city').textContent = submission.city || 'N/A';
      document.getElementById('state').textContent = submission.state || 'N/A';
      document.getElementById('postal').textContent = submission.postal || 'N/A';
      
      document.getElementById('contactPerson').textContent = submission.contactPerson || 'N/A';
      document.getElementById('email').textContent = submission.email || 'N/A';
      document.getElementById('phone').textContent = submission.phone || 'N/A';

      document.getElementById('question1').innerHTML = getCheckboxHTML(submission.questionCheckbox1);
      document.getElementById('question2').innerHTML = getCheckboxHTML(submission.questionCheckbox2);
      document.getElementById('question3').innerHTML = getCheckboxHTML(submission.questionCheckbox3);
      document.getElementById('question4').innerHTML = getCheckboxHTML(submission.questionCheckbox4);
      document.getElementById('question5').innerHTML = getCheckboxHTML(submission.questionCheckbox5);

      setFileElement('commonSealFile', submission.commonSealFile, 'Common Seal');
      setFileElement('letterHeadFile', submission.letterHeadFile, 'Letter Head');
      
      setSignatureElement('signatureFile', submission.signatureFile);
    }

    function getCheckboxHTML(value) {
      if (value) {
        return '<span class="checkbox-value checkbox-yes">✓ Yes</span>';
      } else {
        return '<span class="checkbox-value checkbox-no">✗ No</span>';
      }
    }

    function getFileURL(filename) {
      if (!filename) return null;
      if (filename.startsWith('http://') || filename.startsWith('https://')) {
        return filename;
      }
      return `/uploads/${filename}`;
    }

    function setFileElement(elementId, filename, label) {
      const element = document.getElementById(elementId);
      element.textContent = '';
      
      if (filename) {
        const url = getFileURL(filename);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.style.cssText = 'color: #5fa88a; text-decoration: none; font-weight: 500;';
        link.textContent = `📎 View ${label}`;
        element.appendChild(link);
      } else {
        const span = document.createElement('span');
        span.style.color = '#999';
        span.textContent = 'Not uploaded';
        element.appendChild(span);
      }
    }

    function setSignatureElement(elementId, signatureFile) {
      const element = document.getElementById(elementId);
      element.textContent = '';
      
      if (signatureFile) {
        const signatureURL = getFileURL(signatureFile);
        const container = document.createElement('div');
        container.style.marginTop = '10px';
        
        const img = document.createElement('img');
        img.src = signatureURL;
        img.alt = 'Signature';
        img.style.cssText = 'max-width: 400px; border: 1px solid #ddd; padding: 10px; background: white;';
        
        container.appendChild(img);
        element.appendChild(container);
      } else {
        const span = document.createElement('span');
        span.style.color = '#999';
        span.textContent = 'No signature uploaded';
        element.appendChild(span);
      }
    }

    async function exportPDF() {
      try {
        window.location.href = `/api/export/pdf/${submissionId}`;
      } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export PDF');
      }
    }

    async function init() {
      const authenticated = await checkAuth();
      if (authenticated) {
        await loadSubmission();
      }
    }

    init();
