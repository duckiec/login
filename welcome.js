document.addEventListener('DOMContentLoaded', function() {
    const username = sessionStorage.getItem('username');
    if (username) {
        document.getElementById('username').textContent = username;
    } else {
        window.location.href = '/';
    }
});
