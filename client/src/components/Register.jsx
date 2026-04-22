import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        setMessage('Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        const data = await response.json();
        setMessage(data.error || 'Registration failed');
      }
    } catch (err) {
      setMessage('Server error. Is the backend running?');
    }
  };

  return (
    <div className="auth-container">
      <h2>New Intern Registration</h2>
      <form onSubmit={handleRegister} className="auth-form">
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
        <button type="submit" className="btn-auth btn-reg">
          Register Account
        </button>
      </form>
      {message && (
        <p style={{ marginTop: '15px', color: message.includes('successful') ? 'green' : 'red' }}>
          {message}
        </p>
      )}
      <p style={{ marginTop: '20px', fontSize: '14px' }}>
        Already have an account?{' '}
        <Link to="/login" className="auth-link">
          Login here
        </Link>
        .
      </p>
    </div>
  );
}
