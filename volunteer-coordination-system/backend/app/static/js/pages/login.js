/**
 * Smart Resource Allocation - Login Logic
 */

let selectedRole = 'volunteer';

// 1. Initial Checks
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("Login page initialized");
        checkAlreadyLoggedIn();
        prefillRememberedEmail();
        setupRippleEffect();

        // Form submission listener
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
            console.log("Login form listener attached");
        } else {
            console.error("Login form not found!");
        }
    } catch (err) {
        console.error("Initialization error:", err);
    }
});

/**
 * Checks if a token already exists and redirects if so
 */
function checkAlreadyLoggedIn() {
    try {
        const token = localStorage.getItem('token');
        if (token && token !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr && userStr !== 'undefined') {
                const user = JSON.parse(userStr);
                redirectByRole(user.role || 'volunteer');
            } else {
                window.location.href = 'dashboard.html';
            }
        }
    } catch (e) {
        console.warn("Auth check failed, clearing storage:", e);
        localStorage.clear();
    }
}

/**
 * Prefills email if "Remember Me" was previously checked
 */
function prefillRememberedEmail() {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        const emailInput = document.getElementById('email');
        const rememberCheckbox = document.getElementById('rememberMe');
        if (emailInput) emailInput.value = savedEmail;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
}

/**
 * 1. togglePassword()
 * Toggles visibility of the password field
 */
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.password-toggle');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.textContent = '🙈'; // Change icon
    } else {
        passwordInput.type = 'password';
        toggleIcon.textContent = '👁️'; // Change icon
    }
}

/**
 * 2. selectRole(role, element)
 * Highlights the selected role pill
 */
function selectRole(role, element) {
    selectedRole = role;

    // Remove active class from all pills
    const pills = document.querySelectorAll('.role-pill');
    pills.forEach(pill => pill.classList.remove('active'));

    // Add active class to clicked pill
    element.classList.add('active');

    // Toggle register link visibility (NGOs cannot register openly)
    const registerContainer = document.getElementById('registerContainer');
    if (registerContainer) {
        if (role === 'ngo' || role === 'ngo_admin') {
            registerContainer.style.display = 'none';
        } else {
            registerContainer.style.display = 'block';
        }
    }
}

/**
 * 3. validateForm()
 * Basic client-side validation
 */
function validateForm() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let isValid = true;

    // Reset styles
    document.getElementById('email').parentElement.parentElement.classList.remove('error');
    document.getElementById('password').parentElement.parentElement.classList.remove('error');

    if (!email || !emailRegex.test(email)) {
        showToast('Please enter a valid email address.', 'error');
        isValid = false;
    }

    if (!password || password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        isValid = false;
    }

    return isValid;
}

/**
 * 4. handleLogin(event)
 * Processes the login attempt
 */
async function handleLogin(event) {
    if (event) event.preventDefault();
    console.log("Login attempt started...");

    if (!validateForm()) {
        console.log("Validation failed");
        shakeForm();
        return;
    }

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginBtn = document.getElementById('loginBtn');
    const btnSpinner = document.getElementById('btnSpinner');
    const btnText = document.getElementById('btnText');

    // Show loading state
    loginBtn.disabled = true;
    btnSpinner.style.display = 'block';
    btnText.textContent = 'Logging in...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                role: selectedRole === 'ngo_admin' ? 'ngo' : selectedRole
            })
        });

        const data = await response.json();

        if (response.ok) {
            // SUCCESS
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));

            if (data.data.volunteer) {
                localStorage.setItem('volunteer', JSON.stringify(data.data.volunteer));
            }

            if (selectedRole === 'community') {
                try {
                    const profileResponse = await fetch('/api/community/profile', {
                        headers: {
                            'Authorization': `Bearer ${data.data.token}`
                        }
                    });
                    const profileData = await profileResponse.json();
                    if (profileResponse.ok) {
                        localStorage.setItem('community', JSON.stringify(profileData.data.profile));
                    }
                } catch (err) {
                    console.error("Failed to fetch community profile:", err);
                }
            }

            if (selectedRole === 'ngo' || selectedRole === 'ngo_admin') {
                try {
                    const profileResponse = await fetch('/api/ngo/profile', {
                        headers: {
                            'Authorization': `Bearer ${data.data.token}`
                        }
                    });
                    const profileData = await profileResponse.json();
                    if (profileResponse.ok) {
                        localStorage.setItem('ngo', JSON.stringify(profileData.data.ngo));
                    }
                } catch (err) {
                    console.error("Failed to fetch NGO profile:", err);
                }
            }

            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            showToast('Login successful! Welcome back.', 'success');

            // Brief pause for the toast
            setTimeout(() => {
                redirectByRole(selectedRole);
            }, 1000);

        } else {
            // FAILURE (401/400)
            showToast(data.message || 'Invalid credentials. Please try again.', 'error');
            shakeForm();
            resetButton();
        }
    } catch (error) {
        // NETWORK ERROR
        console.error('Login error:', error);
        showToast('Server unreachable. Please try later.', 'error');
        resetButton();
    }

    function resetButton() {
        loginBtn.disabled = false;
        btnSpinner.style.display = 'none';
        btnText.textContent = 'Login';
    }
}

/**
 * Redirects user based on their role
 */
function redirectByRole(role) {
    switch (role) {
        case 'volunteer':
            window.location.href = 'dashboard.html';
            break;
        case 'ngo':
        case 'ngo_admin':
            window.location.href = 'ngo-dashboard.html';
            break;
        case 'super_admin':
            window.location.href = 'dashboard.html';
            break;
        case 'community':
            window.location.href = 'community-dashboard.html';
            break;
        default:
            window.location.href = 'dashboard.html';
    }
}

/**
 * 5. showToast(message, type)
 * Displays a floating notification
 */
function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span style="margin-right: 10px">${icon}</span> ${message}`;

    container.appendChild(toast);

    // Animation trigger
    setTimeout(() => toast.classList.add('show'), 100);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

/**
 * Shakes the form on error
 */
function shakeForm() {
    const wrapper = document.querySelector('.form-wrapper');
    wrapper.classList.add('shake');
    setTimeout(() => wrapper.classList.remove('shake'), 500);
}

/**
 * Setup Ripple Effect for buttons
 */
function setupRippleEffect() {
    const buttons = document.querySelectorAll('.login-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            let x = e.clientX - e.target.offsetLeft;
            let y = e.clientY - e.target.offsetTop;

            let ripples = document.createElement('span');
            ripples.style.left = x + 'px';
            ripples.style.top = y + 'px';
            ripples.classList.add('ripple');
            this.appendChild(ripples);

            setTimeout(() => {
                ripples.remove();
            }, 600);
        });
    });
}
