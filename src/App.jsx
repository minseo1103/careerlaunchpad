import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';

const STATUS_OPTIONS = ['Pending', 'Interview', 'Decline', 'Accepted'];

function App() {
  const [session, setSession] = useState(null)
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState([]);

  // Toast State
  const [toast, setToast] = useState(null); // { message, type, undoAction }
  const toastTimeoutRef = useRef(null);



  const showToast = (message, type = 'info', undoAction = null) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type, undoAction });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000); // Show for 4 seconds
  };

  const closeToast = () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(null);
  };

  const fetchMetadata = async (targetUrl) => {
    setLoading(true);
    try {
      const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`);
      const data = await response.json();

      if (data.status === 'success') {
        const { title, publisher } = data.data;
        let company = publisher || 'Unknown Company';
        let position = title || 'Unknown Position';

        // Specific handling for LinkedIn URLs
        if (targetUrl.includes('linkedin.com') || publisher?.toLowerCase().includes('linkedin')) {
          // Attempt to parse "Company hiring Position in Location | LinkedIn"
          // Example: "Asian Private Banker hiring Business Technology Executive in Hong Kong... | LinkedIn"
          const hiringMatch = title.match(/^(.*?) hiring (.*?) in .*? \| LinkedIn$/);
          if (hiringMatch) {
            company = hiringMatch[1];
            position = hiringMatch[2];
          } else {
            // Fallback: Try "Position at Company" which sometimes appears
            // Example: "Software Engineer at Google | LinkedIn" (Less common for job posts but possible)
            const atMatch = title.match(/^(.*?) at (.*?) \| LinkedIn$/);
            if (atMatch) {
              // heuristic: usually Position at Company
              // But be careful if it fails to match correctly.
              // Let's just stick to cleaning up the title if specific regex fails
              position = title.replace(' | LinkedIn', '');
              company = 'LinkedIn (Check Details)';
            }
          }
        }

        const newApp = {
          id: Date.now(),
          company: company,
          position: position,
          date: new Date().toISOString().split('T')[0],
          status: 'Pending',
          url: targetUrl
        };
        setApplications(prev => [newApp, ...prev]);
        showToast('Application added successfully', 'success');
        setUrl('');
      } else {
        throw new Error('Failed to fetch metadata');
      }
    } catch (error) {
      console.error(error);
      const manualApp = {
        id: Date.now(),
        // Keep user input URL if possible even on error? 
        // Logic below already handles manual adding
        company: 'Edit Company',
        position: 'Edit Position',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        url: targetUrl
      };
      setApplications(prev => [manualApp, ...prev]);
      showToast('Added manually. Edit details below.', 'warning');
      setUrl('');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    if (url) {
      fetchMetadata(url);
    } else {
      const newApp = {
        id: Date.now(),
        company: 'New Company',
        position: 'New Position',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        url: ''
      };
      setApplications([newApp, ...applications]);
      showToast('New row added', 'success');
    }
  };

  const handleUpdate = (id, field, value) => {
    setApplications(applications.map(app =>
      app.id === id ? { ...app, [field]: value } : app
    ));
  };

  const handleDelete = (id) => {
    const appToDelete = applications.find(app => app.id === id);
    if (!appToDelete) return; // Should not happen

    // Optimistic delete
    setApplications(applications.filter(app => app.id !== id));

    // Show Toast with Undo
    showToast(
      `Deleted ${appToDelete.company} application`,
      'info',
      () => {
        setApplications(prev => {
          // Insert back at previous index if possible, or just add to top/bottom. 
          // For simplicity and to match generic undo, let's just add it back to the top.
          // A better sort order would be by date, but simpler is safer here.
          return [appToDelete, ...prev].sort((a, b) => b.id - a.id);
        });
        showToast('Deletion undone', 'success');
      }
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Internship Tracker</h1>
          <p className="subtitle">Manage and track your career opportunities with ease.</p>
        </div>
        <button className="delete-btn" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }} onClick={handleLogout}>
          Log Out
        </button>
      </header>

      <div className="input-section">
        <input
          type="text"
          placeholder="Paste Internship URL (e.g., LinkedIn link)..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddRow()}
        />
        <button className="add-btn" onClick={handleAddRow} disabled={loading}>
          {loading ? <span className="loading"></span> : 'Add Application'}
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Position</th>
              <th>Date Applied</th>
              <th>Status</th>
              <th>Link</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id}>
                <td
                  contentEditable
                  suppressContentEditableWarning
                  className="editable"
                  onBlur={(e) => handleUpdate(app.id, 'company', e.target.innerText)}
                >
                  {app.company}
                </td>
                <td
                  contentEditable
                  suppressContentEditableWarning
                  className="editable"
                  onBlur={(e) => handleUpdate(app.id, 'position', e.target.innerText)}
                >
                  {app.position}
                </td>
                <td>
                  <input
                    type="date"
                    value={app.date}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', font: 'inherit' }}
                    onChange={(e) => handleUpdate(app.id, 'date', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={app.status}
                    className={`status-badge status-${app.status.toLowerCase()}`}
                    onChange={(e) => handleUpdate(app.id, 'status', e.target.value)}
                    style={{ border: 'none', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td>
                  {app.url ? (
                    <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                      🔗 Visit
                    </a>
                  ) : '-'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="delete-btn" onClick={() => handleDelete(app.id)}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                  No applications yet. Paste a link above to start!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type} show`}>
          <span>{toast.message}</span>
          {toast.undoAction && (
            <button className="toast-undo-btn" onClick={() => {
              toast.undoAction();
              // Don't close immediately, show "Undone" message via the action itself if needed,
              // but here user expects feedback. The undoAction calls showToast('Undone') so it handles it.
            }}>
              Undo
            </button>
          )}
          <button className="toast-close-btn" onClick={closeToast}>×</button>
        </div>
      )}
    </div>
  );
}

export default App;
