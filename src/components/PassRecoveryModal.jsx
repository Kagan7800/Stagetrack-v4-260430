import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Passwordless Pass Recovery Modal (§5 Task 7).
 * Single input auto-detecting email vs phone.
 * Constant-time response feedback.
 */
export function PassRecoveryModal({ isOpen, onClose }) {
  const [contactInput, setContactInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');

  if (!isOpen) return null;

  // Auto-detect input format
  const isEmail = contactInput.includes('@');
  const hasDigits = /\d/.test(contactInput);
  const contactIcon = isEmail ? '✉️' : hasDigits ? '📱' : '🔍';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contactInput.trim() || loading) return;

    try {
      setLoading(true);
      const functions = getFunctions();
      const recoverFn = httpsCallable(functions, 'recoverGuestPass');
      const res = await recoverFn({ contact: contactInput.trim() });

      setResponseMessage(
        res.data?.message || "If a pass is associated with that contact, we've sent your access link."
      );
      setIsSubmitted(true);
    } catch (err) {
      console.error('Recovery request error:', err);
      // Even on error, show the friendly generic confirmation to preserve constant-time UX
      setResponseMessage("If a pass is associated with that contact, we've sent your access link.");
      setIsSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setContactInput('');
    setResponseMessage('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth: '440px',
          width: '100%',
          padding: '28px 24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          textAlign: 'center',
        }}
      >
        {!isSubmitted ? (
          <form onSubmit={handleSubmit}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                margin: '0 auto 16px auto',
              }}
            >
              {contactIcon}
            </div>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '19px',
                fontWeight: '700',
                color: '#0f172a',
              }}
            >
              Recover Your Access Link
            </h3>

            <p
              style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: '#64748b',
                lineHeight: '1.5',
              }}
            >
              Enter the email or mobile phone number you used to register. We will send you a fresh access link.
            </p>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <input
                type="text"
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                placeholder="Email or mobile phone (e.g. 555-123-4567)"
                required
                autoFocus
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '15px',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !contactInput.trim()}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading || !contactInput.trim() ? 0.7 : 1,
                }}
              >
                {loading ? 'Sending...' : 'Send Link'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                margin: '0 auto 16px auto',
              }}
            >
              ✓
            </div>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '19px',
                fontWeight: '700',
                color: '#0f172a',
              }}
            >
              Link Sent
            </h3>

            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '14px',
                color: '#64748b',
                lineHeight: '1.5',
              }}
            >
              {responseMessage}
            </p>

            <button
              type="button"
              onClick={handleReset}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
