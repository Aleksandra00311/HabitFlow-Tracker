document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    // --- REGISTER LOGIC ---
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Stop page from refreshing

            const username = document.getElementById("regUsername").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const password = document.getElementById("regPassword").value;
            const confirmPassword = document.getElementById("regConfirmPassword").value;

            // 1. Check if passwords match
            if (password !== confirmPassword) {
                alert("Passwords do not match!");
                return;
            }

            // 2. Fetch existing users or initialize empty array
            let users = JSON.parse(localStorage.getItem("users")) || [];

            // 3. Check if email is already taken
            const emailExists = users.some(user => user.email === email);
            if (emailExists) {
                alert("An account with this email already exists.");
                return;
            }

            // 4. Save new user data
            users.push({ username, email, password });
            localStorage.setItem("users", JSON.stringify(users));

            alert("Registration successful! Redirecting to Login...");
            window.location.href = "login.html";
        });
    }

    // --- LOGIN LOGIC ---
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Stop page from refreshing

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;

            // Fetch stored users
            let users = JSON.parse(localStorage.getItem("users")) || [];

            // Look for matching credentials
            const validUser = users.find(user => user.email === email && user.password === password);

            if (validUser) {
                // Store active user details for session persistence
                localStorage.setItem("currentUser", JSON.stringify(validUser));
                alert(`Welcome back, ${validUser.username}!`);
                window.location.href = "dashboard.html";
            } else {
                alert("Invalid email or password. Please try again.");
            }
        });
    }
});