// Simple auth client
(function () {

  // Your new live backend URL
  const BASE_URL = "https://vox-server-production.up.railway.app";

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      if (!username || !password) {
        return alert('Enter username and password');
      }

      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password })
        });


        const data = await res.json();

        if (!res.ok) {
          return alert(data.error || 'Login failed');
        }

        // forward user into Vox OS
        window.location.href = '/index.html';

      } catch (err) {
        console.error(err);
        alert('Login failed');
      }
    });
  }

})();
