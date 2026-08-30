/**
 * Shared Permission-Enforced Panel Header Component
 * Encapsulates the standard Stagetrack role-permission open/close pattern:
 * - Displays feature title and icon
 * - Shows instructor-only '✕' close button when user has instructor permissions
 * - Standardized for Chat, Doodle Time, Studio Controls, and future panels
 */
export default function PermissionHeader({
  title = '',
  subtitle = '',
  icon = null,
  isInstructor = false,
  onClose,
  closeTitle = 'Close (Instructor Only)',
  className = 'chat-header',
  closeBtnClassName = 'chat-close',
  style = undefined,
  extra = null,
  children
}) {
  return (
    <div className={className} style={style}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && <span className="header-icon">{icon}</span>}
          {title && <h3 style={{ margin: 0 }}>{title}</h3>}
          {extra}
        </div>
        {subtitle && (
          <p className="header-subtitle" style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#E6DAF7', opacity: 0.95 }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
      {isInstructor && onClose && (
        <button
          type="button"
          className={closeBtnClassName}
          onClick={onClose}
          title={closeTitle}
        >
          ✕
        </button>
      )}
    </div>
  );
}
