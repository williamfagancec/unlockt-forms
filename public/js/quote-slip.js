function setupFileUpload(
  inputId,
  boxId,
  previewId,
  fileNameId,
  fileSizeId,
  deleteId,
) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(boxId);
  const preview = document.getElementById(previewId);
  const fileName = document.getElementById(fileNameId);
  const fileSize = document.getElementById(fileSizeId);
  const deleteBtn = document.getElementById(deleteId);
  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }
  function handleFile(file) {
    if (file) {
      const maxBytes = 10 * 1024 * 1024; // 10 MB
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      
      if (!allowed.includes(file.type)) {
        alert("Unsupported file type. Please upload PDF, JPEG, or PNG files only.");
        input.value = "";
        preview.classList.remove("active");
        box.style.display = "block";
        return;
      }
      
      if (file.size > maxBytes) {
        alert("File size exceeds the maximum limit of 10 MB");
        input.value = "";
        preview.classList.remove("active");
        box.style.display = "block";
        return;
      }
      
      fileName.textContent = file.name;
      fileSize.textContent = formatFileSize(file.size);
      preview.classList.add("active");
      box.style.display = "none";
    }
  }
  box.addEventListener("click", () => input.click());
  input.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });
  box.addEventListener("dragover", (e) => {
    e.preventDefault();
    box.classList.add("dragover");
  });
  box.addEventListener("dragleave", () => {
    box.classList.remove("dragover");
  });
  box.addEventListener("drop", (e) => {
    e.preventDefault();
    box.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      try {
        input.files = files;
      } catch {}
      handleFile(files[0]);
    }
  });
  deleteBtn.addEventListener("click", () => {
    input.value = "";
    preview.classList.remove("active");
    box.style.display = "block";
  });
}
setupFileUpload(
  "cocFile",
  "cocUploadBox",
  "cocPreview",
  "cocFileName",
  "cocFileSize",
  "deleteCoc",
);
setupFileUpload(
  "defectsRelevantDocsFile",
  "defectsRelevantDocsUploadBox",
  "defectsRelevantDocsPreview",
  "defectsRelevantDocsFileName",
  "defectsRelevantDocsFileSize",
  "defectsRelevantDocsDelete",
);
setupFileUpload(
  "whsFile",
  "whsUploadBox",
  "whsPreview",
  "whsFileName",
  "whsFileSize",
  "whsDelete",
);
setupFileUpload(
  "claimsHistoryFile",
  "claimsHistoryUploadBox",
  "claimsHistoryPreview",
  "claimsHistoryFileName",
  "claimsHistoryFileSize",
  "claimsHistoryDelete",
);
setupFileUpload(
  "strataPlansFile",
  "strataPlansUploadBox",
  "strataPlansPreview",
  "strataPlansFileName",
  "strataPlansFileSize",
  "strataPlansDelete",
);
setupFileUpload(
  "asbestosReportFile",
  "asbestosReportUploadBox",
  "asbestosReportPreview",
  "asbestosReportFileName",
  "asbestosReportFileSize",
  "asbestosReportDelete",
);
setupFileUpload(
  "commercialTenantListFile",
  "commercialTenantListUploadBox",
  "commercialTenantListPreview",
  "commercialTenantListFileName",
  "commercialTenantListFileSize",
  "commercialTenantListDelete",
);
setupFileUpload(
  "mostRecentValuationFile",
  "mostRecentValuationUploadBox",
  "mostRecentValuationPreview",
  "mostRecentValuationFileName",
  "mostRecentValuationFileSize",
  "mostRecentValuationDelete",
);
setupFileUpload(
  "preventativeMaintenanceProgramFile",
  "preventativeMaintenanceProgramUploadBox",
  "preventativeMaintenanceProgramPreview",
  "preventativeMaintenanceProgramFileName",
  "preventativeMaintenanceProgramFileSize",
  "preventativeMaintenanceProgramDelete",
);
let signaturePad;
let csrfToken = null;

async function getCsrfToken() {
  try {
    const response = await fetch("/api/csrf-token", { credentials: "include" });
    const data = await response.json();
    return data.data.csrfToken;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    throw error;
  }
}
const canvas = document.getElementById("signatureCanvas");
const placeholder = document.getElementById("signaturePlaceholder");
const signatureError = document.getElementById("signatureError");
const signatureDataInput = document.getElementById("signatureData");
function resizeCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  canvas.getContext("2d").scale(ratio, ratio);
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
signaturePad = new SignaturePad(canvas, {
  backgroundColor: "rgb(255, 255, 255)",
  penColor: "rgb(0, 0, 0)",
  minWidth: 1,
  maxWidth: 3,
  velocityFilterWeight: 0.7,
  minDistance: 5,
  throttle: 0,
});
const signatureDrawingArea = document.getElementById("signatureDrawingArea");
const signaturePreviewContainer = document.getElementById(
  "signaturePreviewContainer",
);
const signaturePreviewImg = document.getElementById("signaturePreviewImg");
signaturePad.addEventListener("beginStroke", () => {
  placeholder.classList.add("hidden");
  signatureError.classList.remove("active");
});
document.getElementById("clearSignature").addEventListener("click", () => {
  signaturePad.clear();
  placeholder.classList.remove("hidden");
  signatureError.classList.remove("active");
});
document.getElementById("submitSignature").addEventListener("click", () => {
  if (signaturePad.isEmpty()) {
    signatureError.classList.add("active");
    return;
  }
  const data = signaturePad.toDataURL("image/png");
  signatureDataInput.value = data;
  signaturePreviewImg.src = data;
  signatureDrawingArea.classList.add("hidden");
  signaturePreviewContainer.classList.add("active");
  signatureError.classList.remove("active");
});
document.getElementById("deleteSignature").addEventListener("click", () => {
  signaturePad.clear();
  placeholder.classList.remove("hidden");
  signatureDataInput.value = "";
  signaturePreviewImg.src = "";
  signatureDrawingArea.classList.remove("hidden");
  signaturePreviewContainer.classList.remove("active");
  signatureError.classList.remove("active");
});
async function loadInsurers() {
  const select = document.getElementById("currentInsurer");
  const errorDiv = document.getElementById("insurerError");
  try {
    const response = await fetch("/api/insurers");
    if (!response.ok) {
      throw new Error("Failed to fetch insurers");
    }
    const insurers = await response.json();
    select.innerHTML = '<option value="">Please Select</option>';
    insurers.forEach((insurer) => {
      const option = document.createElement("option");
      option.value = insurer.name;
      option.textContent = insurer.name;
      select.appendChild(option);
    });
    select.disabled = false;
  } catch (error) {
    console.error("Error loading insurers:", error);
    select.innerHTML = '<option value="">Please Select</option>';
    select.disabled = false;
    errorDiv.style.display = "block";
  }
}
loadInsurers();
async function loadDropdown(
  apiEndpoint,
  selectId,
  defaultOption = "Please Select",
) {
  const select = document.getElementById(selectId);
  try {
    const response = await fetch(apiEndpoint);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${selectId}`);
    }
    const items = await response.json();
    select.innerHTML = `<option value="">${defaultOption}</option>`;
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.name;
      option.textContent = item.name;
      select.appendChild(option);
    });
    select.disabled = false;
  } catch (error) {
    console.error(`Error loading ${selectId}:`, error);
    select.innerHTML = `<option value="">${defaultOption}</option>`;
    select.disabled = false;
  }
}
function generateYearOptions() {
  const select = document.getElementById("yearBuilt");
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= 1850; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    select.appendChild(option);
  }
}
loadDropdown("/api/roof-types", "roofType");
loadDropdown("/api/external-wall-types", "externalWallType");
loadDropdown("/api/floor-types", "floorType");
loadDropdown("/api/building-types", "buildingType");
generateYearOptions();
document
  .getElementById("quoteSlipForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    // Clear previous error highlights
    document
      .querySelectorAll(".error")
      .forEach((el) => el.classList.remove("error"));
    // Validate required fields
    const requiredFields = [
      { id: "strataManagementName", name: "Strata Management Name" },
      { id: "contactPerson", name: "Contact Person" },
      { id: "strataPlanNumber", name: "Strata Plan Number" },
      { id: "renewalDate", name: "Renewal Date" },
      { id: "declarationFullName", name: "Declaration Full Name" },
      { id: "declarationPosition", name: "Declaration Position" },
    ];
    let firstError = null;
    const errors = [];
    requiredFields.forEach((field) => {
      const input = document.getElementById(field.id);
      if (!input.value.trim()) {
        input.classList.add("error");
        errors.push(field.name);
        if (!firstError) firstError = input;
      }
    });
    // Check required declaration checkboxes
    const requiredCheckboxes = [
      { name: "declarationAuthorised", label: "Authorization declaration" },
      { name: "declarationAppointUnlockt", label: "Appointment of Unlockt" },
      {
        name: "declarationAccurateInfo",
        label: "Accurate information declaration",
      },
      { name: "declarationStrataManager", label: "Strata manager declaration" },
      { name: "declarationTrueAnswers", label: "True answers declaration" },
    ];
    requiredCheckboxes.forEach((checkbox) => {
      const input = document.querySelector(`input[name="${checkbox.name}"]`);
      if (input && !input.checked) {
        let checkboxLabel = input.closest("label");
        if (!checkboxLabel && input.id) {
          checkboxLabel = document.querySelector(`label[for="${input.id}"]`);
        }
        if (checkboxLabel) {
          checkboxLabel.classList.add("error");
        }
        errors.push(checkbox.label);
        if (!firstError) firstError = input;
      }
    });
    // If there are validation errors, scroll to first error and show message
    if (errors.length > 0) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      const errorMessage = document.getElementById("errorMessage");
      errorMessage.textContent = `Please fill in all required fields: ${errors.join(", ")}`;
      errorMessage.style.display = "block";
      window.scrollBy(0, -100); // Adjust scroll position to account for offset
      return;
    }
    if (!signatureDataInput.value) {
      signatureError.textContent =
        "Please submit your signature before submitting the form";
      signatureError.classList.add("active");
      signatureError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    signatureError.classList.remove("active");
    const formData = new FormData(e.target);
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
    try {
      if (!csrfToken) {
        csrfToken = await getCsrfToken();
      }

      const response = await fetch("/api/submit-quote-slip", {
        method: "POST",
        headers: {
          "x-csrf-token": csrfToken,
        },
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        document.getElementById("successMessage").style.display = "block";
        document.getElementById("errorMessage").style.display = "none";
        document.getElementById("quoteSlipForm").style.display = "none";
        window.scrollTo(0, 0);
      } else {
        throw new Error(result.error || "Submission failed");
      }
    } catch (error) {
      document.getElementById("errorMessage").textContent =
        "Error: " + error.message;
      document.getElementById("errorMessage").style.display = "block";
      document.getElementById("successMessage").style.display = "none";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit to Unlockt";
    }
  });
