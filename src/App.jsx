import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';

const STATUS_OPTIONS = ['Pending', 'Interview', 'Decline', 'Accepted'];
const COLUMN_LABELS = {
  company: 'Company',
  position: 'Position',
  date: 'Date Applied',
  status: 'Status',
  notes: 'Notes',
  risk: 'Risk',
  link: 'Link',
  actions: 'Actions'
};
const DEFAULT_VISIBLE_COLUMNS = {
  company: true,
  position: true,
  date: true,
  status: true,
  notes: true,
  risk: true,
  link: true,
  actions: true
};

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
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editingValue, setEditingValue] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('visibleColumns');
      return saved ? { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) } : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });

  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    try {
      localStorage.setItem('visibleColumns', JSON.stringify(visibleColumns));
    } catch {
      // ignore storage errors
    }
  }, [visibleColumns]);

  const companyOptions = useMemo(() => {
    const set = new Set(applications.map(app => (app.company || '').trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [applications]);

  const positionOptions = useMemo(() => {
    const set = new Set(applications.map(app => (app.position || '').trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [applications]);

  const normalizeText = (value) => (value || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const normalizeUrl = (value) => {
    if (!value) return '';
    try {
      const parsed = new URL(value);
      return `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
    } catch {
      return value.toLowerCase().trim();
    }
  };

  const getRiskAssessment = (app) => {
    const url = (app.url || '').trim().toLowerCase();
    if (!url) {
      return { level: 'Unknown', score: 0, signals: ['No job URL'] };
    }

    let score = 0;
    const signals = [];
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'cutt.ly', 'rebrand.ly'];
    const freeHosts = ['wixsite.com', 'weebly.com', 'blogspot.com', 'sites.google.com', 'github.io', 'notion.site', 'webflow.io'];
    const knownJobBoards = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'wellfound.com', 'lever.co', 'greenhouse.io'];

    if (shorteners.some(domain => url.includes(domain))) {
      score += 3;
      signals.push('Shortened URL');
    }
    if (freeHosts.some(domain => url.includes(domain))) {
      score += 2;
      signals.push('Free hosting domain');
    }
    if (url.startsWith('http://')) {
      score += 1;
      signals.push('Not HTTPS');
    }

    const companyTokens = normalizeText(app.company)
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(' ')
      .filter(token => token.length > 3);
    const domain = url.replace(/^https?:\/\//, '').split('/')[0];
    const companyMatchesDomain = companyTokens.some(token => domain.includes(token));
    if (!companyMatchesDomain && !knownJobBoards.some(domainName => domain.includes(domainName))) {
      score += 1;
      signals.push('Company name not in domain');
    }

    const suspiciousWords = [
      'quick money',
      'no experience',
      'instant hire',
      'training fee',
      'pay to start',
      'wire money',
      'crypto',
      'deposit required'
    ];
    const text = normalizeText(`${app.position || ''} ${app.notes || ''}`);
    if (suspiciousWords.some(word => text.includes(word))) {
      score += 2;
      signals.push('Suspicious wording');
    }

    let level = 'Low';
    if (score >= 4) level = 'High';
    else if (score >= 2) level = 'Medium';

    return { level, score, signals: signals.length ? signals : ['No obvious signals'] };
  };

  const sortedApplications = useMemo(() => {
    const { key, direction } = sortConfig;
    const dir = direction === 'asc' ? 1 : -1;
    const list = [...filteredApplications];
    list.sort((a, b) => {
      if (key === 'date') {
        return (new Date(a.date) - new Date(b.date)) * dir;
      }
      if (key === 'status') {
        return a.status.localeCompare(b.status) * dir;
      }
      if (key === 'risk') {
        return (getRiskAssessment(a).score - getRiskAssessment(b).score) * dir;
      }
      const valueA = normalizeText(a[key]);
      const valueB = normalizeText(b[key]);
      return valueA.localeCompare(valueB) * dir;
    });
    return list;
  }, [filteredApplications, sortConfig]);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;

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

      const urlKey = normalizeUrl(targetUrl);
      const companyKey = normalizeText(company);
      const positionKey = normalizeText(position);
      const hasDuplicate = applications.some(app =>
        (urlKey && normalizeUrl(app.url) === urlKey) ||
        (companyKey && positionKey &&
          normalizeText(app.company) === companyKey &&
          normalizeText(app.position) === positionKey)
      );

      if (hasDuplicate) {
        const proceed = window.confirm('This looks like a duplicate entry. Add anyway?');
        if (!proceed) {
          showToast('Duplicate skipped', 'info');
          setLoading(false);
          return;
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

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const startEditing = (app, field) => {
    setEditingCell({ id: app.id, field });
    setEditingValue(app[field] || '');
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const commitEditing = () => {
    if (!editingCell) return;
    handleUpdate(editingCell.id, editingCell.field, editingValue.trim());
    cancelEditing();
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
        <details className="columns-toggle">
          <summary>Columns</summary>
          <div className="columns-menu">
            {Object.entries(COLUMN_LABELS).map(([key, label]) => (
              <label key={key} className="columns-item">
                <input
                  type="checkbox"
                  checked={visibleColumns[key]}
                  onChange={() =>
                    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="table-container">
        <datalist id="company-options">
          {companyOptions.map(option => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id="position-options">
          {positionOptions.map(option => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <table>
          <thead>
            <tr>
              {visibleColumns.company && (
                <th className="sortable" onClick={() => handleSort('company')}>
                  Company {sortConfig.key === 'company' && <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </th>
              )}
              {visibleColumns.position && (
                <th className="sortable" onClick={() => handleSort('position')}>
                  Position {sortConfig.key === 'position' && <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </th>
              )}
              {visibleColumns.date && (
                <th className="sortable" onClick={() => handleSort('date')}>
                  Date Applied {sortConfig.key === 'date' && <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </th>
              )}
              {visibleColumns.status && (
                <th className="sortable" onClick={() => handleSort('status')}>
                  Status {sortConfig.key === 'status' && <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </th>
              )}
              {visibleColumns.notes && <th>Notes</th>}
              {visibleColumns.risk && (
                <th className="sortable" onClick={() => handleSort('risk')}>
                  Risk {sortConfig.key === 'risk' && <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </th>
              )}
              {visibleColumns.link && <th>Link</th>}
              {visibleColumns.actions && <th></th>}
            </tr>
          </thead>
          <tbody>
            {sortedApplications.map((app) => {
              const risk = getRiskAssessment(app);
              return (
              <tr key={app.id}>
                {visibleColumns.company && (
                  <td data-label="Company">
                    {editingCell?.id === app.id && editingCell?.field === 'company' ? (
                      <input
                        className="cell-input"
                        list="company-options"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={commitEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEditing();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                      />
                    ) : (
                      <button className="cell-display" onClick={() => startEditing(app, 'company')}>
                        {app.company}
                      </button>
                    )}
                  </td>
                )}
                {visibleColumns.position && (
                  <td data-label="Position">
                    {editingCell?.id === app.id && editingCell?.field === 'position' ? (
                      <input
                        className="cell-input"
                        list="position-options"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={commitEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEditing();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                      />
                    ) : (
                      <button className="cell-display" onClick={() => startEditing(app, 'position')}>
                        {app.position}
                      </button>
                    )}
                  </td>
                )}
                {visibleColumns.date && (
                  <td data-label="Date Applied">
                    <input
                      type="date"
                      value={app.date}
                      style={{ background: 'transparent', border: 'none', color: 'inherit', font: 'inherit' }}
                      onChange={(e) => handleUpdate(app.id, 'date', e.target.value)}
                    />
                  </td>
                )}
                {visibleColumns.status && (
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
                )}
                {visibleColumns.notes && (
                  <td
                    data-label="Notes"
                    contentEditable
                    suppressContentEditableWarning
                    className="editable notes-cell"
                    onBlur={(e) => handleUpdate(app.id, 'notes', e.target.innerText)}
                  >
                    {app.notes || ''}
                  </td>
                )}
                {visibleColumns.risk && (
                  <td data-label="Risk" title={`Heuristic signals: ${risk.signals.join(', ')}`}>
                    <span className={`risk-badge risk-${risk.level.toLowerCase()}`}>
                      {risk.level}
                    </span>
                  </td>
                )}
                {visibleColumns.link && (
                  <td data-label="Link">
                    {app.url ? (
                      <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                        🔗 Visit
                      </a>
                    ) : '-'}
                  </td>
                )}
                {visibleColumns.actions && (
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    <button className="delete-btn" onClick={() => handleDelete(app.id)}>
                      🗑️
                    </button>
                  </td>
                )}
              </tr>
            )})}
            {sortedApplications.length === 0 && (
              <tr>
                <td colSpan={visibleColumnCount || 1} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
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
