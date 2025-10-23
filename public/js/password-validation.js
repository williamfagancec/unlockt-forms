/**
 * Shared Password Validation Module
 * 
 * Provides reusable password validation logic for all password forms
 * (change password, setup password, reset password)
 */

/**
 * Password validation requirements
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  patterns: {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    number: /[0-9]/,
    special: /[!@#$%^&*(),.?":{}|<>]/
  }
};

/**
 * Validates password against all requirements
 * 
 * @param {string} password - The password to validate
 * @param {string} confirmPassword - The confirmation password
 * @returns {Object} Object with requirement keys and boolean values
 */
function checkPasswordRequirements(password, confirmPassword) {
  return {
    length: password.length >= PASSWORD_REQUIREMENTS.minLength,
    uppercase: PASSWORD_REQUIREMENTS.patterns.uppercase.test(password),
    lowercase: PASSWORD_REQUIREMENTS.patterns.lowercase.test(password),
    number: PASSWORD_REQUIREMENTS.patterns.number.test(password),
    special: PASSWORD_REQUIREMENTS.patterns.special.test(password),
    match: password.length > 0 && password === confirmPassword
  };
}

/**
 * Updates UI elements to show which requirements are met
 * 
 * @param {Object} requirements - Object with requirement keys and boolean values
 * @param {string} prefix - Optional prefix for element IDs (default: 'req-')
 */
function updateRequirementUI(requirements, prefix = 'req-') {
  const elementIds = {
    length: `${prefix}length`,
    uppercase: `${prefix}uppercase`,
    lowercase: `${prefix}lowercase`,
    number: `${prefix}number`,
    special: `${prefix}special`,
    match: `${prefix}match`
  };

  for (const [key, elementId] of Object.entries(elementIds)) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.toggle('met', requirements[key]);
    }
  }
}

/**
 * Main validation function that checks requirements and updates UI
 * 
 * @param {HTMLInputElement} passwordInput - Password input element
 * @param {HTMLInputElement} confirmPasswordInput - Confirm password input element
 * @param {string} prefix - Optional prefix for requirement element IDs (default: 'req-')
 * @returns {boolean} True if all requirements are met, false otherwise
 */
function validatePassword(passwordInput, confirmPasswordInput, prefix = 'req-') {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  const requirements = checkPasswordRequirements(password, confirmPassword);
  updateRequirementUI(requirements, prefix);

  return Object.values(requirements).every(v => v);
}

/**
 * Sets up password validation for a form
 * 
 * @param {string|HTMLInputElement} passwordInputSelector - Password input selector or element
 * @param {string|HTMLInputElement} confirmPasswordInputSelector - Confirm password input selector or element
 * @param {string} prefix - Optional prefix for requirement element IDs (default: 'req-')
 * @returns {Function} Validation function bound to the inputs
 */
function setupPasswordValidation(passwordInputSelector, confirmPasswordInputSelector, prefix = 'req-') {
  const passwordInput = typeof passwordInputSelector === 'string' 
    ? document.querySelector(passwordInputSelector)
    : passwordInputSelector;
  
  const confirmPasswordInput = typeof confirmPasswordInputSelector === 'string'
    ? document.querySelector(confirmPasswordInputSelector)
    : confirmPasswordInputSelector;

  if (!passwordInput || !confirmPasswordInput) {
    console.error('Password validation setup failed: Input elements not found');
    return () => false;
  }

  const validationFunction = () => validatePassword(passwordInput, confirmPasswordInput, prefix);

  passwordInput.addEventListener('input', validationFunction);
  confirmPasswordInput.addEventListener('input', validationFunction);

  return validationFunction;
}
