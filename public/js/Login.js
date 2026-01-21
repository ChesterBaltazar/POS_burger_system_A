// ================= CONFIG =================
const DEBUG_MODE = true;
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

// ================= SESSION CHECK =================
function checkExistingSession() {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const loginTime = localStorage.getItem("loginTime");
    const role = localStorage.getItem("role");
    const now = Date.now();

    if (DEBUG_MODE) {
        console.log("🔎 Session check:", { isAuthenticated, loginTime, role });
    }

    if (isAuthenticated === "true" && loginTime && role) {
        const age = now - Number(loginTime);

        if (age < SESSION_DURATION) {
            if (DEBUG_MODE) console.log("✅ Session valid →", role);

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

    if (DEBUG_MODE) console.log("❌ No valid session");
    return false;
}

// Run on load
checkExistingSession();

// Prevent back button after login
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

    // Clear ANY previous session
    localStorage.clear();

    btn.disabled = true;
    btn.innerHTML = "Signing in...";

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

        // 🔥 ROLE — ONLY admin OR user
        const role = payload.role === "admin" ? "admin" : "user";
        const now = Date.now();

        // ================= STORE SESSION =================
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("loginTime", now.toString());
        localStorage.setItem("role", role);
        localStorage.setItem("userId", payload.id || "");
        localStorage.setItem("username", username);
        localStorage.setItem("authToken", token);

        // Cookies (optional)
        document.cookie = `isLoggedIn=true; path=/; max-age=${SESSION_DURATION / 1000}`;
        document.cookie = `authToken=${token}; path=/; max-age=${SESSION_DURATION / 1000}`;

        if (DEBUG_MODE) console.log("Login success →", role);

        // ================= REDIRECT =================
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

// ================= PASSWORD TOGGLE =================
document.getElementById("togglePassword").addEventListener("click", () => {
    const pass = document.getElementById("pass123");
    pass.type = pass.type === "password" ? "text" : "password";
});

// Focus username on load
document.getElementById("user").focus();
