import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * InstructorPassManagement Component (§6 Task 8).
 * Provides instructors with a comprehensive dashboard to view passes,
 * rotate access links, and revoke access instantly.
 */
export default function InstructorPassManagement({ programId = 'spring-2026' }) {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);
  const [rotatedUrlModal, setRotatedUrlModal] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const functions = getFunctions();
  const listGuestPasses = httpsCallable(functions, 'listGuestPasses');
  const rotatePassLink = httpsCallable(functions, 'rotatePassLink');
  const revokeGuestPass = httpsCallable(functions, 'revokeGuestPass');

  const fetchPasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listGuestPasses({ programId });
      setPasses(res.data?.passes || []);
    } catch (err) {
      console.error('Failed to load guest passes:', err);
      setError(err.message || 'Failed to load guest passes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (programId) {
      fetchPasses();
    }
  }, [programId]);

  const handleRotate = async (passId, adultName) => {
    const confirmed = window.confirm(
      `Are you sure you want to rotate the access link for ${adultName || 'this family'}? All previously issued links on all their devices will stop working immediately.`
    );
    if (!confirmed) return;

    try {
      setActionLoading((prev) => ({ ...prev, [passId]: 'rotating' }));
      const res = await rotatePassLink({ passId });
      setRotatedUrlModal({
        passId,
        adultName,
        passUrl: res.data?.passUrl,
      });
      await fetchPasses();
    } catch (err) {
      console.error('Failed to rotate pass link:', err);
      alert(`Error rotating pass: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [passId]: null }));
    }
  };

  const handleRevoke = async (passId, adultName) => {
    const confirmed = window.confirm(
      `Are you sure you want to REVOKE access for ${adultName || 'this family'}? They will be immediately disconnected and blocked from joining sessions.`
    );
    if (!confirmed) return;

    try {
      setActionLoading((prev) => ({ ...prev, [passId]: 'revoking' }));
      await revokeGuestPass({ passId });
      await fetchPasses();
    } catch (err) {
      console.error('Failed to revoke pass:', err);
      alert(`Error revoking pass: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [passId]: null }));
    }
  };

  const copyToClipboard = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            Guest Pass Management
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Program: <strong style={{ color: '#0f172a' }}>{programId}</strong>
          </p>
        </div>
        <button
          onClick={fetchPasses}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#334155',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh List'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          Loading passes...
        </div>
      ) : passes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
          No guest passes found for this program.
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Family / Adult</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Children</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Contact</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Redeemed</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass) => {
                const isActive = pass.status === 'active';
                const isActioning = actionLoading[pass.id];

                return (
                  <tr key={pass.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a' }}>
                      {pass.adultName || 'Guest Family'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>
                      {Array.isArray(pass.childNames) && pass.childNames.length > 0
                        ? pass.childNames.join(', ')
                        : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>
                      <div>{pass.email}</div>
                      {pass.phone && <div style={{ fontSize: '12px' }}>{pass.phone}</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          background: isActive ? '#ecfdf5' : '#fef2f2',
                          color: isActive ? '#059669' : '#dc2626',
                          border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                        }}
                      >
                        {pass.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>
                      {pass.redeemCount || 0} times
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {isActive && (
                          <button
                            onClick={() => handleRotate(pass.id, pass.adultName)}
                            disabled={!!isActioning}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#3b82f6',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: isActioning ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isActioning === 'rotating' ? 'Rotating...' : 'Rotate Link'}
                          </button>
                        )}
                        {isActive && (
                          <button
                            onClick={() => handleRevoke(pass.id, pass.adultName)}
                            disabled={!!isActioning}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              background: '#fff1f2',
                              color: '#e11d48',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: isActioning ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isActioning === 'revoking' ? 'Revoking...' : 'Revoke'}
                          </button>
                        )}
                        {!isActive && (
                          <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                            Access Revoked
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Freshly Rotated Link Modal */}
      {rotatedUrlModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
              Fresh Access Link Generated
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              A new magic link has been generated for <strong>{rotatedUrlModal.adultName || 'this family'}</strong>. All older links on all previous devices have been invalidated immediately.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '13px', color: '#0f172a' }}>
              {rotatedUrlModal.passUrl}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setRotatedUrlModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
              <button
                onClick={() => copyToClipboard(rotatedUrlModal.passUrl, 'modal')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {copiedId === 'modal' ? 'Copied to Clipboard!' : 'Copy Magic Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
