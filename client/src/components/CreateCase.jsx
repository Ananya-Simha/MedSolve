import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Re-using our form styles!

export default function CreateCase() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    bodySystem: '',
    difficulty: 'Easy',
    patientAge: '',
    patientGender: 'Female',
    patientHistory: '',
    correctDiagnosis: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Format the data to match our database schema
    const newCaseData = {
      ...formData,
      symptoms: ['Pending Review'], // Placeholder for now
      vitals: { heartRate: 80, bloodPressure: '120/80', temperature: 98.6 },
      educationalFact: 'Newly submitted case file.',
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCaseData),
      });

      if (response.ok) {
        navigate('/'); // Send them back to the board to see their new case!
      }
    } catch (err) {
      console.error('Failed to create case', err);
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: '600px', position: 'relative' }}>
      {/* --- NEW: The Close "X" Button --- */}
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          position: 'absolute',
          top: '15px',
          right: '15px',
          background: 'transparent',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          color: '#888',
          transition: 'color 0.2s ease',
        }}
        onMouseOver={(e) => (e.target.style.color = '#333')}
        onMouseOut={(e) => (e.target.style.color = '#888')}
        aria-label="Close"
      >
        ✖
      </button>
      {/* --------------------------------- */}

      <h2>Create New Case File</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="text"
          name="title"
          placeholder="Case Title (e.g. The Silent Ischemia)"
          onChange={handleChange}
          className="auth-input"
          required
        />
        <input
          type="text"
          name="bodySystem"
          placeholder="Body System (e.g. Cardiology)"
          onChange={handleChange}
          className="auth-input"
          required
        />
        <select name="difficulty" onChange={handleChange} className="auth-input">
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="number"
            name="patientAge"
            placeholder="Age"
            onChange={handleChange}
            className="auth-input"
            style={{ flex: 1 }}
            required
          />
          <select
            name="patientGender"
            onChange={handleChange}
            className="auth-input"
            style={{ flex: 1 }}
          >
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </div>
        <textarea
          name="patientHistory"
          placeholder="Patient History / Chief Complaint..."
          onChange={handleChange}
          className="auth-input"
          style={{ height: '100px', resize: 'vertical' }}
          required
        />
        <input
          type="text"
          name="correctDiagnosis"
          placeholder="Correct Diagnosis"
          onChange={handleChange}
          className="auth-input"
          required
        />

        <button type="submit" className="btn-auth btn-login" style={{ marginTop: '10px' }}>
          Submit Case to Archives
        </button>
      </form>
    </div>
  );
}
