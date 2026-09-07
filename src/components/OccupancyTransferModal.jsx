import React from 'react';

/**
 * Modal to display conflict / takeover ("Join here instead") or displacement notices (§5 Task 6).
 */
export function OccupancyTransferModal({
  occupancyState,
  errorMessage,
  onTransfer,
  onDismiss,
}) {
  if (occupancyState !== 'occupied_conflict' && occupancyState !== 'displaced') {
    return null;
  }

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
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          textAlign: 'center',
        }}
      >
        {occupancyState === 'occupied_conflict' ? (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                margin: '0 auto 16px auto',
              }}
            >
              📱
            </div>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#0f172a',
              }}
            >
              Pass Active on Another Device
            </h3>
            <p
              style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: '#64748b',
                lineHeight: '1.5',
              }}
            >
              This guest pass is currently being used on another screen. Would you like to switch and join here instead?
            </p>
            {errorMessage && (
              <p
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '13px',
                  color: '#dc2626',
                  backgroundColor: '#fee2e2',
                  padding: '8px 12px',
                  borderRadius: '8px',
                }}
              >
                {errorMessage}
              </p>
            )}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                onClick={onDismiss}
                style={{
                  flex: 1,
                  padding: '10px 16px',
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
                type="button"
                onClick={onTransfer}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Join Here Instead
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                margin: '0 auto 16px auto',
              }}
            >
              ⚠️
            </div>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#0f172a',
              }}
            >
              Session Transferred
            </h3>
            <p
              style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: '#64748b',
                lineHeight: '1.5',
              }}
            >
              Your session was transferred to another device using this pass.
            </p>
            <button
              type="button"
              onClick={onDismiss}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Got It
            </button>
          </>
        )}
      </div>
    </div>
  );
}
