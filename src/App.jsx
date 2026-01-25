import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';

const STATUS_OPTIONS = ['Pending', 'Interview', 'Decline', 'Accepted'];

function App() {
  const [session, setSession] = useState(null)

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Only verify session on mount, let onAuthStateChange handle the rest
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) setIsInitialLoading(false);
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchApplications().finally(() => setIsInitialLoading(false));
      } else {
        setApplications([]);
        setIsInitialLoading(false);
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Stats
  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'Pending').length,
    interview: applications.filter(app => app.status === 'Interview').length,
    accepted: applications.filter(app => app.status === 'Accepted').length,
    decline: applications.filter(app => app.status === 'Decline').length,
  };

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

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      showToast('Failed to load applications', 'error');
    }
  };

  const fetchMetadata = async (targetUrl) => {
    setLoading(true);
    let company = 'New Company';
    let position = 'New Position';

    try {
      if (targetUrl) {
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`);
        const data = await response.json();

        if (data.status === 'success') {
          const { title, publisher } = data.data;
          company = publisher || 'Unknown Company';
          position = title || 'Unknown Position';

          if (targetUrl.includes('linkedin.com') || publisher?.toLowerCase().includes('linkedin')) {
            const hiringMatch = title.match(/^(.*?) hiring (.*?) in .*? \| LinkedIn$/);
            if (hiringMatch) {
              company = hiringMatch[1];
              position = hiringMatch[2];
            } else {
              const atMatch = title.match(/^(.*?) at (.*?) \| LinkedIn$/);
              if (atMatch) {
                position = title.replace(' | LinkedIn', '');
                company = 'LinkedIn (Check Details)';
              }
            }
          }
        }
      }

      // Add to Supabase
      const newApp = {
        user_id: session.user.id,
        company,
        position,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        url: targetUrl || '',
        notes: ''
      };

      const { data, error } = await supabase
        .from('applications')
        .insert([newApp])
        .select()
        .single();

      if (error) throw error;

      setApplications(prev => [data, ...prev]);
      showToast('Application added successfully', 'success');
      setUrl('');

    } catch (error) {
      console.error('Error adding application:', error);
      // Fallback manual entry logic if API fails but we still want to add
      if (targetUrl && error.message !== 'Error adding application') {
        try {
          const manualApp = {
            user_id: session.user.id,
            company: 'Edit Company',
            position: 'Edit Position',
            date: new Date().toISOString().split('T')[0],
            status: 'Pending',
            url: targetUrl,
            notes: ''
          };
          const { data: manualData, error: manualError } = await supabase
            .from('applications')
            .insert([manualApp])
            .select()
            .single();

          if (manualError) throw manualError;
          setApplications(prev => [manualData, ...prev]);
          showToast('Added manually. Edit details below.', 'warning');
          setUrl('');
        } catch (e) {
          showToast('Error adding application', 'error');
        }
      } else {
        showToast('Error adding application', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    fetchMetadata(url);
  };

  const handleUpdate = async (id, field, value) => {
    // Optimistic UI update
    const previousApps = [...applications];
    setApplications(applications.map(app =>
      app.id === id ? { ...app, [field]: value } : app
    ));

    try {
      const { error } = await supabase
        .from('applications')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating application:', error);
      setApplications(previousApps); // Revert
      showToast('Failed to update', 'error');
    }
  };

  const handleDelete = async (id) => {
    const appToDelete = applications.find(app => app.id === id);
    if (!appToDelete) return;

    // Optimistic UI update
    setApplications(applications.filter(app => app.id !== id));

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast(
        `Deleted ${appToDelete.company} application`,
        'info',
        async () => {
          // Undo logic: Re-insert the deleted item content
          const { id: _, created_at: __, ...appData } = appToDelete;

          const { data, error: restoreError } = await supabase
            .from('applications')
            .insert([appData])
            .select()
            .single();

          if (restoreError) {
            showToast('Failed to undo deletion', 'error');
          } else {
            setApplications(prev => [data, ...prev].sort((a, b) => b.id - a.id));
            showToast('Deletion undone', 'success');
          }
        }
      );

    } catch (error) {
      console.error('Error deleting application:', error);
      fetchApplications(); // Revert by re-fetching
      showToast('Failed to delete', 'error');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setApplications([]);
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="container">
      {isInitialLoading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)', zIndex: 2000 }}>
          <div className="loading" style={{ width: '3rem', height: '3rem', borderWidth: '4px' }}></div>
        </div>
      )}
      <header className="app-header">
        <div>
          <h1>Internship Tracker</h1>
          <p className="subtitle">Manage and track your career opportunities with ease.</p>
        </div>
        <div className="user-actions">
          <span className="user-email">{session.user.email}</span>
          <button className="delete-btn logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      {/* Dashboard Stats */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Total</h3>
          <p>{stats.total}</p>
        </div>
        <div className="stat-card stat-pending">
          <h3>Pending</h3>
          <p>{stats.pending}</p>
        </div>
        <div className="stat-card stat-interview">
          <h3>Interview</h3>
          <p>{stats.interview}</p>
        </div>
        <div className="stat-card stat-accepted">
          <h3>Accepted</h3>
          <p>{stats.accepted}</p>
        </div>
        <div className="stat-card stat-decline">
          <h3>Declined</h3>
          <p>{stats.decline}</p>
        </div>
      </div>

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

      <div className="filter-section">
        <input
          type="text"
          className="search-input"
          placeholder="Search company or position..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="All">All Statuses</option>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Position</th>
              <th>Date Applied</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Link</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map((app) => (
              <tr key={app.id}>
                <td
                  data-label="Company"
                  contentEditable
                  suppressContentEditableWarning
                  className="editable"
                  onBlur={(e) => handleUpdate(app.id, 'company', e.target.innerText)}
                >
                  {app.company}
                </td>
                <td
                  data-label="Position"
                  contentEditable
                  suppressContentEditableWarning
                  className="editable"
                  onBlur={(e) => handleUpdate(app.id, 'position', e.target.innerText)}
                >
                  {app.position}
                </td>
                <td data-label="Date Applied">
                  <input
                    type="date"
                    value={app.date}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', font: 'inherit' }}
                    onChange={(e) => handleUpdate(app.id, 'date', e.target.value)}
                  />
                </td>
                <td data-label="Status">
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
                <td
                  data-label="Notes"
                  contentEditable
                  suppressContentEditableWarning
                  className="editable notes-cell"
                  onBlur={(e) => handleUpdate(app.id, 'notes', e.target.innerText)}
                >
                  {app.notes || ''}
                </td>
                <td data-label="Link">
                  {app.url ? (
                    <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                      🔗 Visit
                    </a>
                  ) : '-'}
                </td>
                <td data-label="Actions" style={{ textAlign: 'right' }}>
                  <button className="delete-btn" onClick={() => handleDelete(app.id)}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {filteredApplications.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
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
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
              toast.undoAction();
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
