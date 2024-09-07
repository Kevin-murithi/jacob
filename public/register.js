// Handle registration form submission
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission

    const termsChecked = document.getElementById('terms').checked;
    if (!termsChecked) {
        alert('You must accept the Terms of Service before registering.');
        return;
    }

    const formData = new FormData(e.target);
    const data = new URLSearchParams(formData).toString();

    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: data
        });

        if (response.ok) {
            alert('Registration successful! Please log in.');
            window.location.href = '/api/users/login'; // Correct redirection to login page
        } else {
            const errorText = await response.text();
            alert('Registration failed: ' + errorText);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An unexpected error occurred.');
    }
});
