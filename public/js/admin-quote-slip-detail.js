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
        const response = await fetch(`/api/quote-slip-submissions/${submissionId}`, { credentials: 'include' });
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
        window.location.href = '/admin/quote-slip';
      }
    }

    function displaySubmission(s) {
      document.getElementById('submissionId').textContent = s.id;
      
      const date = new Date(s.submittedAt);
      document.getElementById('submissionDate').textContent = date.toLocaleString();

      document.getElementById('strataManagementName').textContent = s.strataManagementName || 'N/A';
      document.getElementById('contactPerson').textContent = s.contactPerson || 'N/A';
      document.getElementById('strataPlanNumber').textContent = s.strataPlanNumber || 'N/A';
      
      document.getElementById('address').textContent = s.address || 'N/A';
      document.getElementById('streetAddressLine2').textContent = s.streetAddressLine2 || 'N/A';
      document.getElementById('city').textContent = s.city || 'N/A';
      document.getElementById('state').textContent = s.state || 'N/A';
      document.getElementById('postal').textContent = s.postal || 'N/A';

      document.getElementById('renewalDate').textContent = s.renewalDate || 'N/A';
      document.getElementById('currentInsurer').textContent = s.currentInsurer || 'N/A';
      document.getElementById('currentBuildingSumInsured').textContent = formatCurrency(s.currentBuildingSumInsured);
      document.getElementById('requestedSumInsured').textContent = formatCurrency(s.requestedSumInsured);
      document.getElementById('currentStandardExcess').textContent = formatCurrency(s.currentStandardExcess);
      setFileElement('currentCocFile', s.currentCocFile);

      document.getElementById('roofType').textContent = s.roofType || 'N/A';
      document.getElementById('externalWallType').textContent = s.externalWallType || 'N/A';
      document.getElementById('floorType').textContent = s.floorType || 'N/A';
      document.getElementById('buildingType').textContent = s.buildingType || 'N/A';
      document.getElementById('yearBuilt').textContent = s.yearBuilt || 'N/A';
      document.getElementById('numberOfLots').textContent = s.numberOfLots || 'N/A';
      document.getElementById('numberOfFloors').textContent = s.numberOfFloors || 'N/A';
      document.getElementById('numberOfLifts').textContent = s.numberOfLifts || 'N/A';

      displayFacilities(s);
      
      document.getElementById('requiredCoverFlood').innerHTML = getCheckboxHTML(s.requiredCoverFlood);
      document.getElementById('coverOfficeBearers').innerHTML = getCheckboxHTML(s.coverOfficeBearers);
      document.getElementById('coverOfficeBearersValue').textContent = formatCurrency(s.coverOfficeBearersValue);
      document.getElementById('coverMachineryBreakdown').innerHTML = getCheckboxHTML(s.coverMachineryBreakdown);
      document.getElementById('coverMachineryBreakdownValue').textContent = formatCurrency(s.coverMachineryBreakdownValue);
      document.getElementById('coverCatastrophe').innerHTML = getCheckboxHTML(s.coverCatastrophe);
      document.getElementById('coverCatastropheValue').textContent = formatCurrency(s.coverCatastropheValue);

      document.getElementById('discloseInsuranceDeclined').innerHTML = getCheckboxHTML(s.discloseInsuranceDeclined);
      document.getElementById('discloseAsbestosPresent').innerHTML = getCheckboxHTML(s.discloseAsbestosPresent);
      document.getElementById('discloseHeritageListed').innerHTML = getCheckboxHTML(s.discloseHeritageListed);
      document.getElementById('acpEpsPresent').textContent = s.acpEpsPresent || 'N/A';
      document.getElementById('acpEpsName').textContent = s.acpEpsName || 'N/A';
      document.getElementById('defectsAffectingProperty').textContent = s.defectsAffectingProperty || 'N/A';
      document.getElementById('afssCurrent').textContent = s.afssCurrent || 'N/A';
      document.getElementById('residentialLessThan20Commercial').textContent = s.residentialLessThan20Commercial || 'N/A';
      document.getElementById('majorWorksOver500k').textContent = s.majorWorksOver500k || 'N/A';

      displayDocuments(s);
      displayDeclarations(s);

      document.getElementById('declarationFullName').textContent = s.declarationFullName || 'N/A';
      document.getElementById('declarationPosition').textContent = s.declarationPosition || 'N/A';
      document.getElementById('confirmDisclosures').textContent = s.confirmDisclosures || 'N/A';
      
      setSignatureElement('signatureFile', s.signatureFile);
    }

    function displayFacilities(s) {
      const facilities = [
        { label: 'Pools/Spas', value: s.facilityPoolsSpas },
        { label: 'Jetty', value: s.facilityJetty },
        { label: 'Fire Safety Systems', value: s.facilityFireSafetySystems },
        { label: 'Playground', value: s.facilityPlayground },
        { label: 'Lake', value: s.facilityLake },
        { label: 'Sprinklers', value: s.facilitySprinklers },
        { label: 'Gym', value: s.facilityGym },
        { label: 'Water Feature', value: s.facilityWaterFeature },
        { label: 'EV Chargers', value: s.facilityEvCharges },
        { label: 'Tennis Court', value: s.facilityTennisCourt },
        { label: 'Car Stacker', value: s.facilityCarStacker }
      ];

      const facilitiesDiv = document.getElementById('facilities');
      facilities.forEach(f => {
        const div = document.createElement('div');
        div.innerHTML = `<strong>${f.label}:</strong> ${getCheckboxHTML(f.value)}`;
        facilitiesDiv.appendChild(div);
      });
    }

    function displayDocuments(s) {
      const documents = [
        { label: 'Defects Relevant Docs', file: s.defectsRelevantDocsFile },
        { label: 'WHS', file: s.whsFile },
        { label: 'Claims History', file: s.claimsHistoryFile },
        { label: 'Strata Plans', file: s.strataPlansFile },
        { label: 'Asbestos Report', file: s.asbestosReportFile },
        { label: 'Commercial Tenant List', file: s.commercialTenantListFile },
        { label: 'Most Recent Valuation', file: s.mostRecentValuationFile },
        { label: 'Preventative Maintenance Program', file: s.preventativeMaintenanceProgramFile }
      ];

      const docsDiv = document.getElementById('documents');
      documents.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'field-group';
        
        const label = document.createElement('span');
        label.className = 'field-label';
        label.textContent = doc.label;
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'field-value';
        
        if (doc.file) {
          const url = getFileURL(doc.file);
          const link = document.createElement('a');
          link.href = url;
          link.className = 'file-link';
          link.target = '_blank';
          link.textContent = 'View File';
          valueDiv.appendChild(link);
        } else {
          valueDiv.textContent = 'N/A';
        }
        
        div.appendChild(label);
        div.appendChild(valueDiv);
        docsDiv.appendChild(div);
      });
    }

    function displayDeclarations(s) {
      const declarations = [
        { label: 'Authorised', value: s.declarationAuthorised },
        { label: 'Appoint Unlockt', value: s.declarationAppointUnlockt },
        { label: 'Accurate Information', value: s.declarationAccurateInfo },
        { label: 'Strata Manager', value: s.declarationStrataManager },
        { label: 'True Answers', value: s.declarationTrueAnswers }
      ];

      const declDiv = document.getElementById('declarations');
      declarations.forEach(d => {
        const div = document.createElement('div');
        div.style.marginBottom = '10px';
        div.innerHTML = `<strong>${d.label}:</strong> ${getCheckboxHTML(d.value)}`;
        declDiv.appendChild(div);
      });
    }

    function formatCurrency(value) {
      if (!value) return 'N/A';
      const num = parseInt(value);
      if (isNaN(num)) return value;
      return '$' + num.toLocaleString();
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

    function setFileElement(elementId, filename) {
      const element = document.getElementById(elementId);
      element.textContent = '';
      
      if (filename) {
        const url = getFileURL(filename);
        const link = document.createElement('a');
        link.href = url;
        link.className = 'file-link';
        link.target = '_blank';
        link.textContent = 'View File';
        element.appendChild(link);
      } else {
        element.textContent = 'N/A';
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

    async function init() {
      const authenticated = await checkAuth();
      if (authenticated) {
        await loadSubmission();
      }
    }

    init();
