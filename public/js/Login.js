// public/js/login.js
console.log("Login script loaded");

// Clear any previous session data on login page
function clearSessionOnLoginPage() {
  console.log("Clearing previous session data...");
  localStorage.removeItem("authToken");
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("loginTime");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  
  // Clear all cookies related to auth
  document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "isLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

// Check if user already has a valid session
function checkExistingSession() {
  console.log("Checking for existing session...");
  
  const token = localStorage.getItem("authToken");
  const loginTime = localStorage.getItem("loginTime");
  
  if (token && loginTime) {
    const currentTime = Date.now();
    const sessionAge = currentTime - parseInt(loginTime);
    const eightHours = 8 * 60 * 60 * 1000;
    
    console.log(`Session age: ${sessionAge / 1000 / 60} minutes`);
    
    if (sessionAge < eightHours) {
      const role = localStorage.getItem("role");
      console.log("Found valid session, role:", role);
      
      // Verify with server if token is still valid
      fetch('/api/auth/current-user-simple')
        .then(response => response.json())
        .then(data => {
          if (data.success && data.user) {
            console.log("Server validated session, redirecting...");
            
            // Redirect based on role
            setTimeout(() => {
              if (role === "admin") {
                window.location.href = "/Dashboard/Admin-dashboard";
              } else {
                window.location.href = "/Dashboard/User-dashboard/POS";
              }
            }, 100);
          } else {
            console.log("Server rejected session, clearing localStorage");
            clearSessionOnLoginPage();
          }
        })
        .catch(() => {
          console.log("Could not verify session with server");
          clearSessionOnLoginPage();
        });
      return true;
    } else {
      console.log("Session expired");
      clearSessionOnLoginPage();
    }
  } else {
    console.log("No session found");
  }
  return false;
}

// Display error message
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    errorDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else {
    alert(message);
  }
  
  // Focus on username field
  const usernameField = document.getElementById("user");
  if (usernameField) {
    usernameField.focus();
  }
}

// Toggle password visibility
function setupPasswordToggle() {
  const toggleBtn = document.getElementById("togglePassword");
  const passwordField = document.getElementById("pass123");
  
  if (toggleBtn && passwordField) {
    toggleBtn.addEventListener("click", function(e) {
      e.preventDefault();
      
      if (passwordField.type === "password") {
        passwordField.type = "text";
        this.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.9 4.24C10.5883 4.07888 11.2931 3.99834 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.2047 20.84 15.19M14.12 14.12C13.8454 14.4147 13.5141 14.6512 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1752 15.0074 10.8016 14.8565C10.4281 14.7056 10.0887 14.481 9.80385 14.1962C9.51897 13.9113 9.29439 13.5719 9.14351 13.1984C8.99262 12.8248 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2218 9.18488 10.8538C9.34884 10.4859 9.58525 10.1546 9.88 9.88M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.6819 3.96914 7.65661 6.06 6.06L17.94 17.94Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M1 1L23 23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`;
        this.setAttribute("title", "Hide password");
      } else {
        passwordField.type = "password";
        this.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.0007 12C15.0007 13.6569 13.6576 15 12.0007 15C10.3439 15 9.00073 13.6569 9.00073 12C9.00073 10.3431 10.3439 9 12.0007 9C13.6576 9 15.0007 10.3431 15.0007 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12.0012 5C7.52354 5 3.73326 7.94288 2.45898 12C3.73324 16.0571 7.52354 19 12.0012 19C16.4788 19 20.2691 16.0571 21.5434 12C20.2691 7.94288 16.4788 5 12.0012 5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`;
        this.setAttribute("title", "Show password");
      }
    });
  }
}

// Setup form submission
function setupLoginForm() {
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("testing");
  
  if (!loginForm || !loginBtn) {
    console.error("Login form or button not found!");
    return;
  }
  
  let isLoggingIn = false;
  
  loginForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    // Prevent multiple simultaneous login attempts
    if (isLoggingIn) {
      console.log("Login already in progress");
      return;
    }
    
    const username = document.getElementById("user").value.trim();
    const password = document.getElementById("pass123").value;
    const errorDiv = document.getElementById("errorMessage");
    
    // Clear previous errors
    if (errorDiv) {
      errorDiv.style.display = "none";
      errorDiv.textContent = "";
    }
    
    // Validate inputs
    if (!username || !password) {
      showError("Please enter both username and password");
      return;
    }
    
    // Set logging in flag and update UI
    isLoggingIn = true;
    const originalBtnText = loginBtn.innerHTML;
    loginBtn.disabled = true;
    loginBtn.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <style>
          .spinner {
            animation: rotate 1s linear infinite;
          }
          @keyframes rotate {
            100% { transform: rotate(360deg); }
          }
        </style>
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="80" stroke-dashoffset="60"></circle>
      </svg>
      Signing in...
    `;
    
    try {
      console.log("Attempting login for user:", username);
      
      // Make login request
      const response = await fetch("/Users/Login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name: username,
          password: password
        })
      });
      
      console.log("Response status:", response.status);
      
      // Parse response
      const data = await response.json();
      console.log("Response data:", data);
      
      if (data.success) {
        console.log("Login successful!");
        
        // Store user data in localStorage
        if (data.token) {
          localStorage.setItem("authToken", data.token);
        }
        
        if (data.user) {
          localStorage.setItem("userId", data.user.id || "");
          localStorage.setItem("username", data.user.username || username);
          localStorage.setItem("role", data.user.role || "user");
        } else {
          localStorage.setItem("username", username);
          localStorage.setItem("role", "user");
        }
        
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("loginTime", Date.now().toString());
        
        // Show success state
        loginBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Logging in...
        `;
        loginBtn.style.backgroundColor = "#ffa500";
        
        // Clear form
        document.getElementById("user").value = "";
        document.getElementById("pass123").value = "";
        
        // Redirect based on role
        setTimeout(() => {
          const role = data.user?.role || localStorage.getItem("role") || "user";
          console.log("Redirecting with role:", role);
          
          if (role === "admin") {
            window.location.href = "/Dashboard/Admin-dashboard";
          } else {
            window.location.href = "/Dashboard/User-dashboard/POS";
          }
        }, 1000);
        
      } else {
        // Login failed
        showError(data.message || "Invalid username or password");
        
        // Reset button
        isLoggingIn = false;
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalBtnText;
      }
      
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "Login failed. Please try again.";
      
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage = "Cannot connect to server. Please make sure the server is running.";
      }
      
      showError(errorMessage);
      
      // Reset button
      isLoggingIn = false;
      loginBtn.disabled = false;
      loginBtn.innerHTML = originalBtnText;
    }
  });
}

// Setup Enter key submission
function setupEnterKey() {
  document.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      const activeElement = document.activeElement;
      if (activeElement.id === "user" || activeElement.id === "pass123") {
        e.preventDefault();
        const loginForm = document.getElementById("loginForm");
        if (loginForm) {
          loginForm.dispatchEvent(new Event("submit"));
        }
      }
    }
  });
}

// Check for logout parameter
function checkForLogout() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("logout")) {
    console.log("Logout detected, clearing session");
    clearSessionOnLoginPage();
    
    // Remove logout parameter from URL
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }
}

// Initialize everything when page loads
document.addEventListener("DOMContentLoaded", function() {
  console.log("Login page initialized");
  
  // Clear session on login page
  clearSessionOnLoginPage();
  
  // Check for logout
  checkForLogout();
  
  // Check existing session (but don't auto-redirect on login page)
  // We'll just check but not redirect from login page
  const token = localStorage.getItem("authToken");
  if (token) {
    console.log("Found token, but staying on login page");
    // Optionally verify token but don't redirect
  }
  
  // Setup all functionality
  setupPasswordToggle();
  setupLoginForm();
  setupEnterKey();
  
  // Focus on username field
  const usernameField = document.getElementById("user");
  if (usernameField) {
    setTimeout(() => {
      usernameField.focus();
    }, 100);
  }
  
  // Add some debugging info
  console.log("Server URL:", window.location.origin);
  console.log("Login endpoint:", "/Users/Login");
});

// Make functions available globally for debugging
window.clearSessionOnLoginPage = clearSessionOnLoginPage;
window.checkExistingSession = checkExistingSession;