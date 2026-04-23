/**
 * Smart Resource Allocation - Registration Logic
 */

let selectedRole = 'volunteer';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

/**
 * selectRole(role, element)
 * Toggles user role selection
 */
function selectRole(role, element) {
    selectedRole = role;
    const pills = document.querySelectorAll('.role-pill');
    pills.forEach(pill => pill.classList.remove('active'));
    element.classList.add('active');
}

/**
 * handleRegister(event)
 * Sends registration data to the backend
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Basic Validation
    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
    }

    const registerBtn = document.getElementById('registerBtn');
    const btnSpinner = document.getElementById('btnSpinner');
    const btnText = document.getElementById('btnText');

    // UI Loading State
    registerBtn.disabled = true;
    btnSpinner.style.display = 'block';
    btnText.textContent = 'Creating...';

    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                role: selectedRole,
                first_name: firstName,
                last_name: lastName
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Account created successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showToast(data.message || 'Registration failed. Try again.', 'error');
            resetButton();
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Server error. Please try again later.', 'error');
        resetButton();
    }

    function resetButton() {
        registerBtn.disabled = false;
        btnSpinner.style.display = 'none';
        btnText.textContent = 'Create Account';
    }
}

/**
 * showToast(message, type)
 */
function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span style="margin-right: 10px">${icon}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
