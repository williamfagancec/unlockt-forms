const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");
const submitButton = document.getElementById("submitButton");
const formContainer = document.getElementById("formContainer");

forgotPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;

  errorMessage.classList.remove("show");
  successMessage.classList.remove("show");
  submitButton.disabled = true;
  submitButton.textContent = "Sending...";

  try {
    const csrfToken = await getCsrfToken();

    const response = await fetch("/api/admin/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      successMessage.textContent = data.message;
      successMessage.classList.add("show");
      successMessage.focus();
      forgotPasswordForm.reset();
      submitButton.disabled = true;
      setTimeout(() => {
        submitButton.disabled = false;
        submitButton.textContent = "Send Reset Link";
      }, 10000);

      let additionalInfo = document.getElementById("nextStepsBox");
      if (!additionalInfo) {
        additionalInfo = document.createElement("div");
        additionalInfo.id = "nextStepsBox";
        additionalInfo.classList.add("info-box");
        formContainer.appendChild(additionalInfo);
      }
      additionalInfo.innerHTML = `
            <strong>What's next?</strong>
            <ul style="margin: 10px 0 0 20px; line-height: 1.8;">
              <li>Check your email inbox for the password reset link</li>
              <li>Click the link in the email to reset your password</li>
              <li>The link will expire in 30 minutes</li>
              <li>If you don't see the email, check your spam folder</li>
            </ul>
          `;
    } else {
      const validatorMsg = Array.isArray(data.errors) && data.errors[0]?.msg;
      errorMessage.textContent =
        data.error ||
        validatorMsg ||
        "Failed to send reset link. Please try again.";
      errorMessage.classList.add("show");
      errorMessage.focus();
      submitButton.disabled = false;
      submitButton.textContent = "Send Reset Link";
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    errorMessage.textContent = "An error occurred. Please try again.";
    errorMessage.classList.add("show");
    errorMessage.focus();
    submitButton.disabled = false;
    submitButton.textContent = "Send Reset Link";
  }
});
