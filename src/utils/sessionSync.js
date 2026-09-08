/**
 * Pure predicate to prevent attaching Firestore listeners before
 * authentication has resolved on cold load.
 */
export function shouldAttachSessionListener({ sessionId, currentUser }) {
  return Boolean(sessionId && currentUser);
}
