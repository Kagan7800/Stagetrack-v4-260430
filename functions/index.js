const functions = require("firebase-functions");
const admin = require("firebase-admin");
if (!admin.apps.length) { admin.initializeApp(); }
const db = admin.firestore();
const sgMail = require("@sendgrid/mail");
const { pipeline } = require("./antigravity/pipeline");
const { functions: agFunctions } = require("./antigravity/functions");

// 1️⃣ Set your SendGrid API key
const sendgridKey = functions.config().sendgrid?.key || process.env.SENDGRID_API_KEY;
if (sendgridKey) {
  sgMail.setApiKey(sendgridKey);
} else {
  console.warn("SendGrid API key is not set. Please configure it.");
}

// Simple Markdown-to-HTML helper for email styling
function convertMarkdownToHtml(markdown) {
  let html = markdown;

  // Format headers
  html = html.replace(/^#\s+(.+)$/gm, '<h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 24px; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-family: system-ui, sans-serif;">$1</h1>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 style="font-size: 16px; font-weight: 700; color: #1e3a8a; margin-top: 20px; margin-bottom: 8px; font-family: system-ui, sans-serif;">$1</h2>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 16px; margin-bottom: 6px; font-family: system-ui, sans-serif;">$1</h3>');

  // Format bold/italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a;">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em style="color: #475569;">$1</em>');

  // Format list items
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left: 20px; margin-bottom: 8px; color: #334155; font-family: system-ui, sans-serif;">$1</li>');

  // Split and format paragraphs
  const lines = html.split('\n');
  const formattedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed === '---' || trimmed.startsWith('<h') || trimmed.startsWith('<li')) {
      if (trimmed === '---') return '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">';
      return line;
    }
    return `<p style="margin: 0 0 12px 0; color: #334155; font-family: system-ui, sans-serif;">${line}</p>`;
  });

  return formattedLines.join('\n');
}

// Master HTML email template generator
function buildEmailTemplate(explanation, payload) {
  const formattedHtmlContent = convertMarkdownToHtml(explanation);
  const childName = payload.childName || "Danny";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Personalized Music Fun Recommendation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Card Wrapper -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Colored Accent Line -->
          <tr>
            <td height="6" style="background: linear-gradient(90deg, #facc15 0%, #3b82f6 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #0f172a;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <img src="https://stagetrack-v4-260430-461-92681.web.app/assets/Logo_modern.png" alt="Music Fun Logo" height="50" style="display: block; outline: none; border: none; height: 50px;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px; color: #94a3b8; font-size: 13px; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase; font-family: system-ui, sans-serif;">
                    Personalized Alignment Report
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Profile Overview Box -->
          <tr>
            <td style="padding: 24px 30px 10px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="font-size: 14px; font-weight: bold; color: #1e293b; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.02em; font-family: system-ui, sans-serif;">
                    Child Profile Overview
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 15px; color: #334155; line-height: 1.6; font-family: system-ui, sans-serif;">
                    <strong>Child Name:</strong> ${childName}<br>
                    <strong>Age Group:</strong> ${payload.childAge}<br>
                    <strong>Core Traits:</strong> ${payload.traitsSelected.join(", ")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Narrative Body -->
          <tr>
            <td style="padding: 10px 30px 30px 30px; font-size: 15px; color: #334155; line-height: 1.6;">
              ${formattedHtmlContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 500; font-family: system-ui, sans-serif;">
                Music Fun With Your Little One &copy; 2026. All rights reserved.
              </p>
              <!-- Gemini Branding -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                <tr>
                  <td align="center" style="font-size: 11px; color: #94a3b8; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; font-family: system-ui, sans-serif;">
                    <span>Powered by</span>
                    <span style="font-weight: 800; color: #3b82f6; text-decoration: none;">Gemini</span>
                    <span>✨</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

exports.personalizedExplanation = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body || {};

    if (!payload.childAge && payload.age) {
      payload.childAge = `${payload.age} years old`;
    }
    if (!payload.childAge) {
      payload.childAge = "2-3 years old";
    }

    if (!payload.traitsSelected && payload.traits && typeof payload.traits === 'object') {
      payload.traitsSelected = Object.entries(payload.traits)
        .filter(([k, v]) => v && k !== 'notes')
        .map(([_, v]) => String(v));
    }

    if (!payload.traitsSelected || !Array.isArray(payload.traitsSelected) || payload.traitsSelected.length === 0) {
      payload.traitsSelected = ["Music Exploration"];
    }

    if (!payload.parentEmail) {
      return res.status(400).json({
        error: "Missing required field: parentEmail"
      });
    }

    let explanation = null;
  let geminiSucceeded = false;

    // 2️⃣ Call Gemini
    try {
      const geminiResult = await pipeline({
        model: "gemini-3.1-flash-lite",
        function: agFunctions.generatePersonalizedMusicFunExplanation,
        arguments: payload
      });

      explanation =
        geminiResult?.output?.explanation ||
        geminiResult?.output ||
        null;
      geminiSucceeded = !!explanation;
    } catch (err) {
      console.error("Gemini failed:", err);
    }

    // 3️⃣ If failed → friendly fallback
    if (!explanation) {
      explanation =
        "We’re having trouble generating your personalized explanation right now, but your child’s unique traits and interests are wonderful. Please try again in a moment!";
    }

    try {
      await db.collection('agentLogs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        model: 'gemini-3.1-flash-lite',
        input: payload,
        output: explanation,
        usedFallback: !geminiSucceeded
      });
    } catch (e) { console.error('Log write failed:', e.message); }

    // Build the branded HTML template
    const emailHtmlContent = buildEmailTemplate(explanation, payload);

    // 4️⃣ Email the explanation to the parent
    const msg = {
      to: payload.parentEmail,
      from: "hello@musicfunwithyourlittleone.com", // your verified sender
      subject: "Your Personalized Music Fun Program Recommendation",
      text: explanation,
      html: emailHtmlContent
    };

    try { await sgMail.send(msg); } catch (e) { console.error('SendGrid failed:', e.message); }

    // 5️⃣ Return explanation to Wix as well
    return res.status(200).json({
      explanation,
      emailed: true
    });

  } catch (err) {
    console.error("Firebase Function Error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message
    });
  }
});

exports.assignSessionInstructor = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }
  const sessionId = data?.sessionId;
  if (!sessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing sessionId parameter.');
  }

  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    await sessionRef.set({
      instructorUid: context.auth.uid,
      createdAt: Date.now()
    }, { merge: true });
  } else {
    const sessionData = sessionSnap.data();
    if (!sessionData.instructorUid || sessionData.instructorUid === context.auth.uid) {
      await sessionRef.update({
        instructorUid: context.auth.uid
      });
    }
  }

  // Set custom claims on the instructor's auth token
  await admin.auth().setCustomUserClaims(context.auth.uid, {
    instructor: true,
    sessionId
  });

  return { success: true, instructorUid: context.auth.uid };
});

