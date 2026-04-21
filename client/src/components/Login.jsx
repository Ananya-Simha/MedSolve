import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // credentials: 'include' tells React to save the login cookie!
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        setMessage('Login successful! Welcome back, Doctor.');
        setTimeout(() => navigate('/'), 1500); // Send them to the Case Board
      } else {
        setMessage('Invalid username or password.');
      }
    } catch (err) {
      setMessage('Server error. Is the backend running?');
    }
  };

  return (
    <div className="auth-container">
      <h2>MedSolve Staff Login</h2>
      <form onSubmit={handleLogin} className="auth-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="auth-input"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
          required
        />
        <button type="submit" className="btn-auth btn-login">
          Login
        </button>
      </form>
      {message && (
        <p style={{ marginTop: '15px', color: message.includes('successful') ? 'green' : 'red' }}>
          {message}
        </p>
      )}
      <p style={{ marginTop: '20px', fontSize: '14px' }}>
        Need an account?{' '}
        <Link to="/register" className="auth-link">
          Register here
        </Link>
        .
      </p>
    </div>
  );
}
