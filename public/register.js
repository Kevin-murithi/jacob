// Handle registration form submission
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission

    // Check if the Terms of Service are accepted
    const termsChecked = document.getElementById('terms').checked;
    if (!termsChecked) {
        alert('You must accept the Terms of Service before registering.');
        return;
    }

    // Convert form data to URL-encoded format
    const formData = new FormData(e.target);
    const data = new URLSearchParams(formData).toString();

    try {
        // Send a POST request to the registration endpoint
        const response = await fetch('https://jacob.railway.internal/register', {  // Corrected URL path
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            // Registration successful, redirect to login page
            alert('Registration successful! Please log in.');
            window.location.href = 'login.html'; // Correct redirection to login page
        } else {
            // Handle failed registration
            const errorText = await response.text();
            alert('Registration failed: ' + errorText);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An unexpected error occurred.');
    }
});
