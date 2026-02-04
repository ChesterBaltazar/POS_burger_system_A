class TabStorageManager {
    constructor() {
        this.storage = window.sessionStorage;
        this.tabId = this.getTabId();
        this.prefix = 'tab_';
    }


    getTabId() {
        let tabId = this.storage.getItem('tabId');
        if (!tabId) {
            tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.storage.setItem('tabId', tabId);
        }
        return tabId;
    }


    getKey(key) {
        return `${this.prefix}${this.tabId}_${key}`;
    }


    setItem(key, value) {
        try {
            this.storage.setItem(this.getKey(key), JSON.stringify({
                value: value,
                timestamp: Date.now(),
                tabId: this.tabId
            }));
            return true;
        } catch (error) {
            console.error('Error storing data for tab:', error);
            return false;
        }
    }


    getItem(key) {
        try {
            const data = this.storage.getItem(this.getKey(key));
            if (!data) return null;
            
            const parsed = JSON.parse(data);

            if (parsed.tabId !== this.tabId) {
                this.removeItem(key);
                return null;
            }
            return parsed.value;
        } catch (error) {
            console.error('Error retrieving data for tab:', error);
            return null;
        }
    }


    removeItem(key) {
        this.storage.removeItem(this.getKey(key));
    }


    clearTabData() {
        const keysToRemove = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(this.prefix + this.tabId)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => this.storage.removeItem(key));
    }


    clearAllTabData() {
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(this.prefix)) {
                this.storage.removeItem(key);
                i--;
            }
        }
    }


    hasValidSession() {
        const token = this.getItem('authToken');
        const loginTime = this.getItem('loginTime');
        
        if (!token || !loginTime) return false;
        
        const currentTime = Date.now();
        const sessionAge = currentTime - parseInt(loginTime);
        const eightHours = 8 * 60 * 60 * 1000;
        
        return sessionAge < eightHours;
    }
}


window.tabStorage = new TabStorageManager();


function clearTabSessionOnLoginPage() {
    window.tabStorage.clearTabData();
    

    localStorage.removeItem("authToken");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("loginTime");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    

    document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "isLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}


async function checkTabSession() {
    
    
    if (window.tabStorage.hasValidSession()) {
        try {
            const response = await fetch('/api/auth/current-user-simple');
            const data = await response.json();
            
            if (data.success && data.user) {
                
    
                window.tabStorage.setItem('role', data.user.role);
                window.tabStorage.setItem('username', data.user.username);
                window.tabStorage.setItem('userId', data.user.id);
                

                setTimeout(() => {
                    if (data.user.role === "admin") {
                        window.location.href = "/Dashboard/Admin-dashboard";
                    } else {
                        window.location.href = "/Dashboard/User/POS";
                    }
                }, 100);
                return true;
            } else {
                clearTabSessionOnLoginPage();
            }
        } catch (error) {
            clearTabSessionOnLoginPage();
        }
    } else {
        console.log("No valid tab session found");
    }
    return false;
}


function showError(message) {
    const errorDiv = document.getElementById("errorMessage");
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
        errorDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
        

        setTimeout(() => {
            errorDiv.style.display = "none";
        }, 5000);
    } else {
        alert(message);
    }
    

    const usernameField = document.getElementById("user");
    if (usernameField) {
        usernameField.focus();
    }
}


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
        

        if (isLoggingIn) {
            return;
        }
        
        const username = document.getElementById("user").value.trim();
        const password = document.getElementById("pass123").value;
        const errorDiv = document.getElementById("errorMessage");
        

        if (errorDiv) {
            errorDiv.style.display = "none";
            errorDiv.textContent = "";
        }
        

        if (!username) {
            showError("Please enter username");
            document.getElementById("user").focus();
            return;
        }
        
        if (!password) {
            showError("Please enter password");
            document.getElementById("pass123").focus();
            return;
        }
        

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
            

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Server returned non-JSON response");
            }
            

            const data = await response.json();
            
            if (data.success) {
                

                if (data.token) {
                    window.tabStorage.setItem("authToken", data.token);

                    localStorage.setItem("authToken", data.token);
                }
                
                if (data.user) {
                    window.tabStorage.setItem("userId", data.user.id || "");
                    window.tabStorage.setItem("username", data.user.username || username);
                    window.tabStorage.setItem("role", data.user.role || "user");
                    

                    localStorage.setItem("userId", data.user.id || "");
                    localStorage.setItem("username", data.user.username || username);
                    localStorage.setItem("role", data.user.role || "user");
                } else {
                    window.tabStorage.setItem("username", username);
                    window.tabStorage.setItem("role", "user");
                    localStorage.setItem("username", username);
                    localStorage.setItem("role", "user");
                }
                
                window.tabStorage.setItem("isAuthenticated", "true");
                window.tabStorage.setItem("loginTime", Date.now().toString());
                localStorage.setItem("isAuthenticated", "true");
                localStorage.setItem("loginTime", Date.now().toString());
                

                loginBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                   Logging in...
                `;
                loginBtn.style.backgroundColor = "#28a745";
                

                document.getElementById("user").value = "";
                document.getElementById("pass123").value = "";
                

                setTimeout(() => {

                  const role = data.user?.role || window.tabStorage.getItem("role") || "user";
                    
                    if (role === "admin") {
                        window.location.href = "/Dashboard/Admin-dashboard";
                    } else {
                        window.location.href = "/Dashboard/User-dashboard/POS";
                    }
                }, 800);
                
            } else {

              showError(data.message || "Invalid username or password");
                

              isLoggingIn = false;
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalBtnText;
            }
            
        } catch (error) {
            console.error("Login error:", error);
            
            let errorMessage = "Login failed. Please try again.";
            
            if (error.name === "TypeError" && error.message.includes("fetch")) {
                errorMessage = "Cannot connect to server. Please check your internet connection and make sure the server is running.";
            } else if (error.message.includes("non-JSON")) {
                errorMessage = "Server error. Please contact administrator.";
            }
            
            showError(errorMessage);
            

            isLoggingIn = false;
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalBtnText;
        }
    });
}


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


function checkForLogout() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("logout")) {
        clearTabSessionOnLoginPage();
        

        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}


function setupFormFocus() {
    const usernameField = document.getElementById("user");
    const passwordField = document.getElementById("pass123");
    

    if (usernameField) usernameField.value = "";
    if (passwordField) passwordField.value = "";
    

    if (usernameField) {
        setTimeout(() => {
            usernameField.focus();
        }, 300);
    }
    

    if (usernameField) {
        usernameField.addEventListener('focus', () => {
            const errorDiv = document.getElementById("errorMessage");
            if (errorDiv) {
                errorDiv.style.display = "none";
            }
        });
    }
    
    if (passwordField) {
        passwordField.addEventListener('focus', () => {
            const errorDiv = document.getElementById("errorMessage");
            if (errorDiv) {
                errorDiv.style.display = "none";
            }
        });
    }
}


document.addEventListener("DOMContentLoaded", function() {
    checkForLogout();
    

    const checkSession = async () => {
        const hasSession = await checkTabSession();
        if (!hasSession) {
            
            setupPasswordToggle();
            setupLoginForm();
            setupEnterKey();
            setupFormFocus();
        }
    };
    

    checkSession();
});


window.addEventListener('beforeunload', () => {
    console.log("Tab closing, preserving session data");
});


document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {

      checkTabSession();
    }
});


window.clearTabSessionOnLoginPage = clearTabSessionOnLoginPage;
window.checkTabSession = checkTabSession;