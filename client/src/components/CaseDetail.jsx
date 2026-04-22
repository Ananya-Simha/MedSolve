import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import './CaseDetail.css';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // <-- NEW

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userGuess, setUserGuess] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // <-- UPDATE THIS LINE: Automatically open the form if they clicked Edit on the dashboard!
  const [isEditing, setIsEditing] = useState(location.state?.editMode || false);
  const [editForm, setEditForm] = useState({});
  // ... rest of your code

  useEffect(() => {
    // Fetch the specific case
    fetch(`${import.meta.env.VITE_API_URL}/api/cases/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setCaseData(data);
        setEditForm(data);
        setLoading(false);
      });

    // NEW: Fetch the logged-in user
    fetch(`${import.meta.env.VITE_API_URL}/api/me`, { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => setCurrentUser(data))
      .catch((err) => console.error(err));
  }, [id]);

  // --- NEW: Delete Function ---
  const handleDelete = async () => {
    // Double-check before deleting!
    if (!window.confirm('Are you sure you want to permanently delete this case?')) return;

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/cases/${id}`, { method: 'DELETE' });
      navigate('/'); // Kick them back to the Case Board
    } catch (err) {
      console.error('Failed to delete case', err);
    }
  };

  // --- NEW: Update Function ---
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      setCaseData(editForm); // Update the visual UI with the new data
      setIsEditing(false); // Close the edit mode
    } catch (err) {
      console.error('Failed to update case', err);
    }
  };

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/cases/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setCaseData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching case:', err);
        setLoading(false);
      });
  }, [id]);

  // --- NEW: Logic to check the doctor's guess ---
  const handleDiagnosisSubmit = async () => {
    if (!userGuess.trim()) return;

    if (userGuess.toLowerCase().trim() === caseData.correctDiagnosis.toLowerCase().trim()) {
      setFeedback({
        type: 'success',
        message: 'Spot on, Doctor! That is the correct diagnosis. (+1 Point)',
      });

      // --- NEW: Tell the backend to increase the score! ---
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/user/score`, {
          method: 'POST',
          // CRUCIAL: This sends the login cookie so the server knows WHO scored!
          credentials: 'include',
        });
      } catch (err) {
        console.error('Failed to save score:', err);
      }
    } else {
      setFeedback({ type: 'error', message: 'Incorrect. Please review the vitals and try again.' });
    }
  };

  if (loading) return <h2>Retrieving Patient File...</h2>;
  if (!caseData) return <h2>Case file corrupted or not found.</h2>;

  // ==========================================
  // VIEW 1: THE EDIT FORM
  // ==========================================
  if (isEditing) {
    return (
      // <--- This 'return' is crucial! It stops the rest of the page from loading.
      <div className="detail-container">
        <h2>Edit Case File</h2>
        <form
          onSubmit={handleUpdate}
          style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
        >
          <input
            type="text"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            style={{ padding: '8px' }}
            required
          />
          <input
            type="text"
            value={editForm.bodySystem}
            onChange={(e) => setEditForm({ ...editForm, bodySystem: e.target.value })}
            style={{ padding: '8px' }}
            required
          />
          <select
            value={editForm.difficulty}
            onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
            style={{ padding: '8px' }}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <textarea
            value={editForm.patientHistory}
            onChange={(e) => setEditForm({ ...editForm, patientHistory: e.target.value })}
            style={{ padding: '8px', height: '100px' }}
            required
          />
          <input
            type="text"
            value={editForm.correctDiagnosis}
            onChange={(e) => setEditForm({ ...editForm, correctDiagnosis: e.target.value })}
            style={{ padding: '8px' }}
            required
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="submit"
              style={{
                padding: '10px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              style={{
                padding: '10px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: THE NORMAL PATIENT CHART
  // ==========================================
  return (
    <div className="detail-container">
      <Link to="/" className="back-link">
        ← Back to Case Board
      </Link>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '10px',
        }}
      >
        <h1 style={{ margin: 0 }}>{caseData.title}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsEditing(true)}
            disabled={!currentUser}
            title={!currentUser ? 'Log in to edit cases' : 'Edit Case'}
            style={{
              padding: '6px 12px',
              backgroundColor: '#ffc107',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              color: '#333',
              cursor: currentUser ? 'pointer' : 'not-allowed',
              opacity: currentUser ? 1 : 0.4,
            }}
          >
            Edit Case
          </button>

          <button
            onClick={handleDelete}
            disabled={!currentUser || currentUser.role !== 'Attending'}
            title={
              !currentUser || currentUser.role !== 'Attending'
                ? 'Only Attendings can delete archives'
                : 'Delete Case'
            }
            style={{
              padding: '6px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: currentUser && currentUser.role === 'Attending' ? 'pointer' : 'not-allowed',
              opacity: currentUser && currentUser.role === 'Attending' ? 1 : 0.4,
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="info-bar">
        <div>
          <strong>System:</strong> {caseData.bodySystem}
        </div>
        <div>
          <strong>Difficulty:</strong> {caseData.difficulty}
        </div>
        <div>
          <strong>Age:</strong> {caseData.patientAge}
        </div>
        <div>
          <strong>Gender:</strong> {caseData.patientGender}
        </div>
        <div>
          <strong>Date Filed:</strong> {new Date(caseData.createdAt).toLocaleDateString()}
        </div>
      </div>

      <h2>Chief Complaint</h2>
      <p>{caseData.symptoms.join(', ')}</p>

      <h2>Patient History</h2>
      <p>{caseData.patientHistory}</p>

      <h2>Vitals</h2>
      <ul>
        <li>
          <strong>Blood Pressure:</strong> {caseData.vitals.bloodPressure}
        </li>
        <li>
          <strong>Heart Rate:</strong> {caseData.vitals.heartRate} bpm
        </li>
        <li>
          <strong>Temperature:</strong> {caseData.vitals.temperature} °F
        </li>
      </ul>

      <div className="fact-box">
        <h3>Medical Fact</h3>
        <p>{caseData.educationalFact}</p>
      </div>

      <div className="guessing-game">
        <h2>Submit Your Diagnosis</h2>
        <div className="guess-input-group">
          <input
            type="text"
            placeholder="e.g., Atrial Fibrillation"
            value={userGuess}
            onChange={(e) => setUserGuess(e.target.value)}
            className="guess-input"
          />
          <button onClick={handleDiagnosisSubmit} className="btn-submit">
            Submit
          </button>
        </div>

        {feedback && (
          <div
            className={`feedback-box ${feedback.type === 'success' ? 'feedback-success' : 'feedback-error'}`}
          >
            <strong>{feedback.message}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
