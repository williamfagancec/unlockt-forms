    let signaturePad;
    const canvas = document.getElementById('signatureCanvas');
    const placeholder = document.getElementById('signaturePlaceholder');
    const signatureError = document.getElementById('signatureError');
    const signatureDataInput = document.getElementById('signatureData');

    function resizeCanvas() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 1,
      maxWidth: 3,
      velocityFilterWeight: 0.7,
      minDistance: 5,
      throttle: 0
    });

    const signatureDrawingArea = document.getElementById('signatureDrawingArea');
    const signaturePreviewContainer = document.getElementById('signaturePreviewContainer');
    const signaturePreviewImg = document.getElementById('signaturePreviewImg');

    signaturePad.addEventListener('beginStroke', () => {
      placeholder.classList.add('hidden');
      signatureError.classList.remove('active');
    });

    document.getElementById('clearSignature').addEventListener('click', () => {
      signaturePad.clear();
      placeholder.classList.remove('hidden');
      signatureError.classList.remove('active');
    });

    document.getElementById('submitSignature').addEventListener('click', () => {
      if (signaturePad.isEmpty()) {
        signatureError.classList.add('active');
        return;
      }

      const data = signaturePad.toDataURL('image/png');
      signatureDataInput.value = data;
      signaturePreviewImg.src = data;
      
      signatureDrawingArea.classList.add('hidden');
      signaturePreviewContainer.classList.add('active');
      signatureError.classList.remove('active');
    });

    document.getElementById('deleteSignature').addEventListener('click', () => {
      signaturePad.clear();
      placeholder.classList.remove('hidden');
      signatureDataInput.value = '';
      signaturePreviewImg.src = '';
      
      signatureDrawingArea.classList.remove('hidden');
      signaturePreviewContainer.classList.remove('active');
      signatureError.classList.remove('active');
    });

    function setupFileUpload(inputId, boxId, previewId, fileNameId, fileSizeId, deleteId) {
      const input = document.getElementById(inputId);
      const box = document.getElementById(boxId);
      const preview = document.getElementById(previewId);
      const fileName = document.getElementById(fileNameId);
      const fileSize = document.getElementById(fileSizeId);
      const deleteBtn = document.getElementById(deleteId);

      function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
      }

      function handleFile(file) {
        if (file) {
          fileName.textContent = file.name;
          fileSize.textContent = formatFileSize(file.size);
          preview.classList.add('active');
          box.style.display = 'none';
        }
      }

      box.addEventListener('click', () => input.click());

      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
        }
      });

      box.addEventListener('dragover', (e) => {
        e.preventDefault();
        box.classList.add('dragover');
      });

      box.addEventListener('dragleave', () => {
        box.classList.remove('dragover');
      });

      box.addEventListener('drop', (e) => {
        e.preventDefault();
        box.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          input.files = files;
          handleFile(files[0]);
        }
      });

      deleteBtn.addEventListener('click', () => {
        input.value = '';
        preview.classList.remove('active');
        box.style.display = 'block';
      });
    }

    setupFileUpload('commonSealFile', 'commonSealUploadBox', 'commonSealPreview', 
                    'commonSealFileName', 'commonSealFileSize', 'deleteCommonSeal');
    setupFileUpload('letterHeadFile', 'letterHeadUploadBox', 'letterHeadPreview', 
                    'letterHeadFileName', 'letterHeadFileSize', 'deleteLetterHead');

    document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous error highlights
      document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
      
      // Validate required fields
      const requiredFields = [
        { id: 'strataManagement', name: 'Strata Management' },
        { id: 'strataPlanNumber', name: 'Strata Plan Number' },
        { id: 'submissionDate', name: 'Submission Date' }
      ];
      
      let firstError = null;
      const errors = [];
      
      requiredFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (!input.value.trim()) {
          input.classList.add('error');
          errors.push(field.name);
          if (!firstError) firstError = input;
        }
      });
      
      // Check confirmation checkbox
      const confirmCheckbox = document.getElementById('confirmationCheckbox');
      if (!confirmCheckbox.checked) {
        const checkboxItem = confirmCheckbox.closest('.checkbox-item');
        checkboxItem.classList.add('error');
        errors.push('Confirmation checkbox');
        if (!firstError) firstError = confirmCheckbox;
      }
      
      // If there are validation errors, scroll to first error and show message
      if (errors.length > 0) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = `Please fill in all required fields: ${errors.join(', ')}`;
        errorMessage.style.display = 'block';
        window.scrollBy(0, -100); // Adjust scroll position to account for offset
        return;
      }
      
      if (!signatureDataInput.value) {
        signatureError.textContent = 'Please submit your signature before submitting the form';
        signatureError.classList.add('active');
        signatureError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      signatureError.classList.remove('active');
      
      const formData = new FormData(e.target);

      const submitButton = e.target.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';

      try {
        const response = await fetch('/api/submit-form', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (response.ok) {
          document.getElementById('successMessage').style.display = 'block';
          document.getElementById('errorMessage').style.display = 'none';
          document.getElementById('appointmentForm').style.display = 'none';
          window.scrollTo(0, 0);
        } else {
          throw new Error(result.error || 'Submission failed');
        }
      } catch (error) {
        document.getElementById('errorMessage').textContent = 'Error: ' + error.message;
        document.getElementById('errorMessage').style.display = 'block';
        document.getElementById('successMessage').style.display = 'none';
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit to Unlockt';
      }
    });
