window.onclick = () => console.clear();

// ================= CONFIG =================
const DEBUG_MODE = true;
const SESSION_DURATION = 8 * 60 * 60 * 1000; 

// ================= SESSION CHECK =================
function checkExistingSession() {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const loginTime = localStorage.getItem("loginTime");
    const role = localStorage.getItem("role");
    const now = Date.now();

    if (DEBUG_MODE) {
        console.log("Session check:", { isAuthenticated, loginTime, role });
    }

    if (isAuthenticated === "true" && loginTime && role) {
        const age = now - Number(loginTime);

        if (age < SESSION_DURATION) {
            if (DEBUG_MODE) console.log("Session valid →", role);

            setTimeout(() => {
                if (role === "admin") {
                    window.location.href = "/Dashboard/Admin-dashboard?t=" + now;
                } else {
                    window.location.href = "/Dashboard/User-dashboard/POS?t=" + now;
                }
            }, 100);

            return true;
        }
    }

    if (DEBUG_MODE) console.log("No valid session");
    return false;
}

checkExistingSession();


history.pushState(null, null, location.href);
window.onpopstate = () => history.go(1);

// ================= LOGIN =================
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("user").value.trim();
    const password = document.getElementById("pass123").value;
    const btn = document.getElementById("testing");

    if (!username || !password) {
        alert("Please enter username and password");
        return;
    }


    localStorage.clear();

    btn.disabled = true;
    btn.innerHTML = "Logging in...";

    try {
        if (DEBUG_MODE) console.log("📡 Sending login request");

        const res = await fetch("/Users/Login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: username, password })
        });

        const data = await res.json();

        if (!data.success || !data.token) {
            throw new Error(data.message || "Login failed");
        }

        // ================= JWT DECODE =================
        const token = data.token;
        const payload = JSON.parse(atob(token.split(".")[1]));

        if (DEBUG_MODE) {
            console.log("🔓 JWT payload:", payload);
        }

        const role = payload.role === "admin" ? "admin" : "user";
        const now = Date.now();

        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("loginTime", now.toString());
        localStorage.setItem("role", role);
        localStorage.setItem("userId", payload.id || "");
        localStorage.setItem("username", username);
        localStorage.setItem("authToken", token);

        document.cookie = `isLoggedIn=true; path=/; max-age=${SESSION_DURATION / 1000}`;
        document.cookie = `authToken=${token}; path=/; max-age=${SESSION_DURATION / 1000}`;

        if (DEBUG_MODE) console.log("Login success →", role);

        setTimeout(() => {
            if (role === "admin") {
                window.location.href = "/Dashboard/Admin-dashboard?t=" + now;
            } else {
                window.location.href = "/Dashboard/User-dashboard/POS?t=" + now;
            }
        }, 500);

    } catch (err) {
        console.error("Login error:", err.message);
        alert(err.message || "Login failed");

        btn.disabled = false;
        btn.innerHTML = "Sign in";
    }
});

// ================= TOGGLE PASSWORD =================
document.getElementById("togglePassword").addEventListener("click", () => {
    const pass = document.getElementById("pass123");
    pass.type = pass.type === "password" ? "text" : "password";
});


document.getElementById("user").focus();

    window.onclick = () => console.clear();
    const DEBUG = true;
    
    // Add AbortController for request cancellation
    let currentLoginController = null;
    
        function clearSessionOnLoginPage() {
    
            console.log("Login page loaded");
        }
        
    
        function checkExistingSession() {
            const token = localStorage.getItem("authToken");
            const loginTime = localStorage.getItem("loginTime");
            
            if (token && loginTime) {
                const currentTime = Date.now();
                const sessionAge = currentTime - parseInt(loginTime);
                const eightHours = 8 * 60 * 60 * 1000;
                
                if (sessionAge < eightHours) {
                    const role = localStorage.getItem("role");
                    console.log("Found existing session, role:", role);
                    
                    // Redirect based on role
                    setTimeout(() => {
                        if (role === "admin") {
                            window.location.href = "/Dashboard/Admin-dashboard";
                        } else if (role === "user") {
                            window.location.href = "/Dashboard/User-dashboard/POS";
                        }
                    }, 100);
                    return true;
                } else {
    
                    localStorage.clear();
                }
            }
            return false;
        }
        
    
        document.addEventListener("DOMContentLoaded", function() {
            console.log("Login page initialized");
            
    
            if (DEBUG) {
                
    
                if (checkExistingSession()) {
                    console.log("User already logged in");
                }
            }
            
    
            document.getElementById("user").focus();
        });
        
    
        document.getElementById("loginForm").addEventListener("submit", async function(e) {
            e.preventDefault();
            
            // Cancel any ongoing login request
            if (currentLoginController) {
                currentLoginController.abort();
                console.log("Previous login request cancelled");
            }
            
            // Create new AbortController for this request
            currentLoginController = new AbortController();
            const signal = currentLoginController.signal;
            
            const username = document.getElementById("user").value.trim();
            const password = document.getElementById("pass123").value;
            const btn = document.getElementById("testing");
            const errorDiv = document.getElementById("errorMessage");
            
            
            errorDiv.style.display = "none";
            errorDiv.textContent = "";
    
            if (!username || !password) {
                showError("Please enter both username and password");
                return;
            }
            
    
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Signing in...';
            
            try {
                console.log("Attempting login for user:", username);
                
            
                const response = await fetch("/Users/Login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        name: username,
                        password: password
                    }),
                    signal: signal // Add abort signal to the request
                });
                
                // Clear the controller since request completed
                currentLoginController = null;
                
                console.log("Response status:", response.status);
                
            
                let data;
                try {
                    data = await response.json();
                } catch (parseError) {
                    console.error("Failed to parse JSON:", parseError);
                    throw new Error("Server returned invalid response");
                }
                
                console.log("Response data:", data);
                
            
                if (data.success === true || data.message?.toLowerCase().includes("success")) {
                    console.log("Login successful!");
                    
            
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
                    
                    // Clear form
                    document.getElementById("user").value = "";
                    document.getElementById("pass123").value = "";
                    
                    // Show success message
                    btn.innerHTML = "Logging in";
                    
                    // Redirect based on role
                    setTimeout(() => {
                        const role = localStorage.getItem("role") || "user";
                        if (role === "admin") {
                            window.location.href = "/Dashboard/Admin-dashboard";
                        } else {
                            window.location.href = "/Dashboard/User-dashboard/POS";
                        }
                    }, 1000);
                    
                } else {
                    // Login failed
                    showError(data.message || "Invalid username or password");
                    btn.disabled = false;
                    btn.innerHTML = "Sign in";
                }
                
            } catch (error) {
                // Check if error is due to abort
                if (error.name === 'AbortError') {
                    console.log('Login request was cancelled');
                    return; // Don't show error or reset button if request was cancelled
                }
                
                console.error("Login error:", error);
                
                let errorMessage = "Login failed. Please try again.";
                
                if (error.message.includes("Network") || error.message.includes("fetch")) {
                    errorMessage = "Cannot connect to server. Please check if the server is running.";
                } else if (error.message.includes("JSON")) {
                    errorMessage = "Server error. Please contact administrator.";
                }
                
                showError(errorMessage);
                btn.disabled = false;
                btn.innerHTML = "Sign in";
                
                // Clear controller on error
                currentLoginController = null;
            }
        });
        
        // Show/hide password
document.getElementById("togglePassword").addEventListener("click", function(e) {
    e.preventDefault(); // Prevent form submission if button is inside form
    const passwordField = document.getElementById("pass123");
    const eyeIcon = document.getElementById("eyeIcon");
    
    if (passwordField.type === "password") {
        passwordField.type = "text";
        eyeIcon.innerHTML = `
            <path d="M9.9 4.24C10.5883 4.07888 11.2931 3.99834 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.2047 20.84 15.19M14.12 14.12C13.8454 14.4147 13.5141 14.6512 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1752 15.0074 10.8016 14.8565C10.4281 14.7056 10.0887 14.481 9.80385 14.1962C9.51897 13.9113 9.29439 13.5719 9.14351 13.1984C8.99262 12.8248 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2218 9.18488 10.8538C9.34884 10.4859 9.58525 10.1546 9.88 9.88M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.6819 3.96914 7.65661 6.06 6.06L17.94 17.94Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M1 1L23 23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        `;
        this.setAttribute("aria-label", "Hide password");
    } else {
        passwordField.type = "password";
        eyeIcon.innerHTML = `
            <path d="M15.0007 12C15.0007 13.6569 13.6576 15 12.0007 15C10.3439 15 9.00073 13.6569 9.00073 12C9.00073 10.3431 10.3439 9 12.0007 9C13.6576 9 15.0007 10.3431 15.0007 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12.0012 5C7.52354 5 3.73326 7.94288 2.45898 12C3.73324 16.0571 7.52354 19 12.0012 19C16.4788 19 20.2691 16.0571 21.5434 12C20.2691 7.94288 16.4788 5 12.0012 5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        `;
        this.setAttribute("aria-label", "Show password");
    }
});

// Enter key to submit - Better approach
document.addEventListener("keydown", function(e) {
    // Only trigger on Enter key (keyCode 13 or key "Enter")
    if (e.key === "Enter" || e.keyCode === 13) {
        // Check if we're in a form input (not on the eye button)
        const activeElement = document.activeElement;
        const isFormInput = activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA";
        
        // Only submit if we're in a form input field
        if (isFormInput) {
            e.preventDefault(); // Prevent any default behavior
            
            const loginForm = document.getElementById("loginForm");
            if (loginForm) {
                // Check if the login button exists and is not disabled
                const loginButton = loginForm.querySelector('button[type="submit"]') || 
                                   document.getElementById("testing") || 
                                   loginForm.querySelector('button');
                
                if (loginButton && !loginButton.disabled) {
                    loginButton.click(); // Simulate clicking the login button
                } else if (loginForm.checkValidity()) {
                    loginForm.submit(); // Submit the form directly
                } else {
                    // Show validation errors
                    loginForm.reportValidity();
                }
            }
        }
    }
});

    function attachEnterKeyToInputs() {
    const formInputs = document.querySelectorAll('#loginForm input');
    formInputs.forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === "Enter" || e.keyCode === 13) {
                e.preventDefault();
                
                const loginForm = document.getElementById("loginForm");
                const loginButton = loginForm.querySelector('button[type="submit"]') || 
                                   document.getElementById("testing");
                
                if (loginButton && !loginButton.disabled) {
                    loginButton.click();
                } else if (loginForm) {
                    loginForm.submit();
                }
            }
        });
        });
        }


        document.addEventListener('DOMContentLoaded', attachEnterKeyToInputs);
        

        function showError(message) {
            const errorDiv = document.getElementById("errorMessage");
            errorDiv.textContent = message;
            errorDiv.style.display = "block";
            
       
            errorDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
            
            // Focus on username field
            document.getElementById("user").focus();
        }
        
       
        if (window.location.search.includes("logout=true")) {
            localStorage.clear();
            console.log("Session cleared due to logout");
        }