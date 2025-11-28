// Simple auth client
(function(){
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      if (!username||!password) return alert('Enter username and password');
      try {
        const res = await fetch('/auth/login', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) return alert(data.error || 'Login failed');
        window.location.href = '/index.html';
      } catch {
        alert('Login failed');
      }
    });
  }
})();