'use strict';

const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { generateToken, hashToken, safeHashToken } = require('./tokens');
const { checkRateLimit } = require('./rateLimiter');

/**
 * Parses cookies from incoming HTTP request.
 *
 * @param {string} cookieHeader Value of req.headers.cookie
 * @returns {Record<string, string>} Key-value cookie map
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (typeof cookieHeader !== 'string' || !cookieHeader.trim()) {
    return cookies;
  }
  cookieHeader.split(';').forEach((pair) => {
    const [name, ...rest] = pair.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  return cookies;
}

/**
 * Standard generic 404 response used identically across not-found, revoked, and malformed requests.
 * Completely leaks no information regarding pass status or existence.
 *
 * @param {object} res Express response object
 */
function sendGenericNotFoundResponse(res) {
  res
    .status(404)
    .set('Referrer-Policy', 'no-referrer')
    .set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    .set('Content-Type', 'text/html; charset=utf-8')
    .send(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Link Invalid</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f8fafc; color: #334155; }
    .card { max-width: 420px; padding: 32px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; }
    h1 { font-size: 20px; margin-bottom: 12px; color: #0f172a; }
    p { font-size: 15px; line-height: 1.5; color: #64748b; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Access Link Invalid or Expired</h1>
    <p>This music session access link is invalid or has expired. Please check your invitation email or message for your latest link.</p>
  </div>
</body>
</html>`
    );
}

/**
 * Standard 429 response when caller exceeds fixed-window rate limit.
 *
 * @param {object} res Express response object
 * @param {number} retryAfterSeconds Seconds to wait before retrying
 */
function sendRateLimitedResponse(res, retryAfterSeconds = 60) {
  res
    .status(429)
    .set('Referrer-Policy', 'no-referrer')
    .set('Retry-After', String(retryAfterSeconds))
    .set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    .set('Content-Type', 'text/html; charset=utf-8')
    .send(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Too Many Requests</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f8fafc; color: #334155; }
    .card { max-width: 420px; padding: 32px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; }
    h1 { font-size: 20px; margin-bottom: 12px; color: #0f172a; }
    p { font-size: 15px; line-height: 1.5; color: #64748b; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Too Many Requests</h1>
    <p>Too many requests have been made from this connection. Please wait a minute and tap your link again.</p>
  </div>
</body>
</html>`
    );
}

/**
 * Generates the minimal client-side authentication bootstrap page.
 * Uses location.replace('/session') so the token completely leaves the browser address bar and history.
 *
 * @param {string} customToken Minted Firebase custom token
 * @returns {string} HTML markup
 */
function buildAuthBootstrapHtml(customToken) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signing In...</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f8fafc; color: #334155; }
    .card { max-width: 400px; padding: 32px; background: white; border-radius: 12px; text-align: center; }
    .spinner { border: 3px solid #e2e8f0; border-top: 3px solid #3b82f6; border-radius: 50%; width: 36px; height: 36px; animation: spin 1s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    h1 { font-size: 18px; margin: 0 0 8px; color: #0f172a; }
    p { font-size: 14px; color: #64748b; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Signing you in...</h1>
    <p>Entering your Music Fun session</p>
  </div>
  <script>
    (function() {
      var customToken = ${JSON.stringify(customToken)};
      sessionStorage.setItem('__mf_auth_token', customToken);
      window.location.replace('/session');
    })();
  </script>
</body>
</html>`;
}

/**
 * HTTP handler for GET /my/:token
 *
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {object} [deps] Injected dependencies for testing (db, auth, now)
 */
async function redeemPassHandler(req, res, deps = {}) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    res.status(405).set('Allow', 'GET').send('Method Not Allowed');
    return;
  }

  const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const db = deps.db || admin.firestore();
  const auth = deps.auth || admin.auth();
  const clockNow = deps.now ? deps.now() : Date.now();

  // 1. Rate Limiting Check
  const rateLimitResult = await checkRateLimit(clientIp, db, clockNow);
  if (!rateLimitResult.allowed) {
    sendRateLimitedResponse(res, rateLimitResult.retryAfterSeconds);
    return;
  }

  // 2. Extract and Validate Token Parameter
  // Matches /my/:token or /:token
  let rawToken = req.params?.token;
  if (!rawToken && req.path) {
    const parts = req.path.replace(/^\/+/, '').split('/');
    if (parts[0] === 'my' && parts[1]) {
      rawToken = parts[1];
    } else if (parts[0] && parts[0] !== 'my') {
      rawToken = parts[0];
    }
  }

  const tokenHash = safeHashToken(rawToken);
  if (!tokenHash) {
    sendGenericNotFoundResponse(res);
    return;
  }

  // 3. Look up active guest pass in Firestore
  try {
    let passDoc = null;
    const arrayQuery = await db
      .collection('guestPasses')
      .where('activeTokenHashes', 'array-contains', tokenHash)
      .limit(1)
      .get();

    if (!arrayQuery.empty) {
      passDoc = arrayQuery.docs[0];
    } else {
      const legacyQuery = await db
        .collection('guestPasses')
        .where('tokenHash', '==', tokenHash)
        .limit(1)
        .get();
      if (!legacyQuery.empty) {
        passDoc = legacyQuery.docs[0];
      }
    }

    if (!passDoc) {
      sendGenericNotFoundResponse(res);
      return;
    }

    const passData = passDoc.data();

    // Must be in 'active' status and not revoked (revoked passes fail with identical 404)
    if (passData.status !== 'active' || passData.revoked === true) {
      sendGenericNotFoundResponse(res);
      return;
    }

    // 4. Device identification using Firebase-Hosting-compatible __session cookie (namespaced as JSON)
    const cookies = parseCookies(req.headers?.cookie);
    let deviceId = null;
    let isNewCookie = false;

    if (cookies.__session) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookies.__session));
        if (parsed && typeof parsed.dev === 'string' && parsed.dev.length >= 16) {
          deviceId = parsed.dev;
        }
      } catch {
        // Fallback for non-JSON or legacy bare strings
        if (typeof cookies.__session === 'string' && cookies.__session.length >= 16) {
          deviceId = cookies.__session;
        }
      }
    }

    if (!deviceId) {
      deviceId = generateToken(32);
      isNewCookie = true;
    }

    const deviceHash = hashToken(deviceId);

    // 5. Mint custom Firebase Auth token using decoupled pass.uid
    // Ensure pass.uid exists (fallback to passDoc.id if older document)
    const userUid = passData.uid || `guest_${passDoc.id}`;
    const customToken = await auth.createCustomToken(userUid, {
      passId: passDoc.id,
      programId: passData.programId,
      isGuest: true,
    });

    // 6. Update pass counters & known devices atomically
    const fv = FieldValue || admin.firestore.FieldValue;
    const updatePayload = {
      redeemCount: fv.increment(1),
      lastRedeemedAt: fv.serverTimestamp(),
    };

    if (fv.arrayUnion) {
      updatePayload.knownDevices = fv.arrayUnion(deviceHash);
    }

    await passDoc.ref.update(updatePayload);

    // 7. Render Bootstrap Response
    // Set namespaced __session cookie if newly generated or refreshing
    if (isNewCookie) {
      const sessionPayload = encodeURIComponent(JSON.stringify({ dev: deviceId }));
      const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
      const secureFlag = isSecure ? '; Secure' : '';
      res.setHeader(
        'Set-Cookie',
        `__session=${sessionPayload}; Path=/; Max-Age=31536000; SameSite=Lax${secureFlag}; HttpOnly`
      );
    }

    res
      .status(200)
      .set('Referrer-Policy', 'no-referrer')
      .set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      .set('Content-Type', 'text/html; charset=utf-8')
      .send(buildAuthBootstrapHtml(customToken));
  } catch (err) {
    console.error('[Redeem] Unexpected internal error during pass lookup:', err.message || err);
    sendGenericNotFoundResponse(res);
  }
}

module.exports = {
  redeemPassHandler,
  parseCookies,
  sendGenericNotFoundResponse,
  sendRateLimitedResponse,
  buildAuthBootstrapHtml,
};
