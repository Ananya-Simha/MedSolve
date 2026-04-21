import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CaseBoard.css';

export default function CaseBoard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null); // This holds our current user/Intern/Attending status!
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/api/cases')
      .then((res) => res.json())
      .then((data) => {
        setCases(data);
        setLoading(false);
      });

    fetch('http://localhost:5000/api/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => setUserStats(data))
      .catch((err) => console.error(err));
  }, []);

  // --- NEW: Handle Deleting directly from the Dashboard ---
  const handleDelete = async (caseId) => {
    if (!window.confirm('Are you sure you want to permanently delete this case?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/cases/${caseId}`, {
        method: 'DELETE',
        credentials: 'include', // Crucial: Tells the backend WHO is deleting
      });

      if (response.ok) {
        // Instantly remove the deleted case from the screen without refreshing
        setCases(cases.filter((c) => c._id !== caseId));
      }
    } catch (err) {
      console.error('Failed to delete case', err);
    }
  };

  if (loading) return <h2>Loading the Clinical Archives...</h2>;

  return (
    <div className="board-container">
      {userStats ? (
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Welcome, Dr. {userStats.username}</h2>
            <p>Rank: {userStats.role}</p>
          </div>
          <div className="score-display">
            <h1>{userStats.casesSolved}</h1>
            <p>Cases Solved</p>
          </div>
        </div>
      ) : (
        <div className="guest-banner">
          <p>
            You are viewing the archives as a guest. <Link to="/login">Log in</Link> to save your
            progress!
          </p>
        </div>
      )}

      <h1>MedSolve: Clinical Mystery Archive</h1>
      <p>Active Cold Cases: {cases.length}</p>

      <div className="case-grid">
        {cases.map((medicalCase) => (
          <div key={medicalCase._id} className="case-card">
            <h3>{medicalCase.title}</h3>
            <p>
              <strong>System:</strong> {medicalCase.bodySystem}
            </p>
            <p>
              <strong>Difficulty:</strong> {medicalCase.difficulty}
            </p>

            <Link to={`/case/${medicalCase._id}`} className="btn-open">
              Open Case File
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
