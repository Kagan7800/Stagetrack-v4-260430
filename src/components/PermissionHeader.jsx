/**
 * Shared Permission-Enforced Panel Header Component
 * Encapsulates the standard Stagetrack role-permission open/close pattern:
 * - Displays feature title and icon
 * - Shows instructor-only '✕' close button when user has instructor permissions
 * - Standardized for Chat, Doodle Time, Studio Controls, and future panels
 */
export default function PermissionHeader({
  title = '',
  icon = null,
  isInstructor = false,
  onClose,
  closeTitle = 'Close (Instructor Only)',
  className = 'chat-header',
  closeBtnClassName = 'chat-close',
  extra = null,
  children
}) {
  return (
    <div className={className}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon && <span className="header-icon">{icon}</span>}
        {title && <h3>{title}</h3>}
        {extra}
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
