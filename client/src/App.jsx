import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css';
import CaseBoard from './components/CaseBoard';
import CaseDetail from './components/CaseDetail';
import Login from './components/Login';
import Register from './components/Register';
import CreateCase from './components/CreateCase';

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Check if someone is logged in when the app loads
  useEffect(() => {
    fetch('http://localhost:5000/api/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await fetch('http://localhost:5000/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null); // Clear the user from React
    navigate('/'); // Send them to the home page
  };

  return (
    <div>
      <nav className="nav-bar">
        <h2 className="nav-title">
          <Link to="/" className="nav-logo">
            MedSolve
          </Link>
        </h2>

        <div className="nav-links">
          {/* Show the active link if logged in, otherwise show a disabled span */}
          {user ? (
            <Link to="/create-case" className="nav-link btn-new-case">
              + New Case
            </Link>
          ) : (
            <span
              className="nav-link btn-new-case"
              title="You must be logged in to create a case."
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            >
              + New Case
            </span>
          )}

          {/* Conditional Login/Logout Buttons */}
          {user ? (
            <>
              <span style={{ color: 'white', marginRight: '10px' }}>Dr. {user.username}</span>
              <button
                onClick={handleLogout}
                className="btn-register"
                style={{ cursor: 'pointer', border: 'none' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/register" className="nav-link btn-register">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<CaseBoard />} />
        <Route path="/case/:id" element={<CaseDetail />} />
        {/* We pass setUser to Login so it can update the Navbar instantly! */}
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/create-case" element={<CreateCase />} />
      </Routes>
    </div>
  );
}

export default App;
