'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Configure SendGrid if key available
const sendgridKey = functions.config().sendgrid?.key || process.env.SENDGRID_API_KEY;
if (sendgridKey) {
  sgMail.setApiKey(sendgridKey);
}

/**
 * Builds SMS message body.
 * Strictly adheres to the Non-Negotiable Invariant:
 * Link ONLY, zero 4-8 digit numeric codes or OTPs.
 *
 * @param {object} params { passUrl, adultName }
 * @returns {string} Plain text SMS body
 */
function buildSmsMessageBody({ passUrl, adultName }) {
  const greeting = adultName && typeof adultName === 'string' && adultName.trim()
    ? `Hi ${adultName.trim()}!`
    : 'Hi there!';

  return `${greeting} Here is your link to enter your live Music Fun session: ${passUrl}`;
}

/**
 * Builds SendGrid email message.
 *
 * @param {object} params { passUrl, adultName, contact, programTitle }
 * @returns {object} SendGrid mail options
 */
function buildEmailMessage({ passUrl, adultName, contact, programTitle = 'Music Fun with My Little One' }) {
  const greeting = adultName && typeof adultName === 'string' && adultName.trim()
    ? `Hi ${adultName.trim()},`
    : 'Hi,';

  return {
    to: contact,
    from: 'hello@musicfunwithyourlittleone.com',
    subject: `Your ${programTitle} Live Session Access Link`,
    text: `${greeting}\n\nHere is your personal link to enter your live Music Fun session:\n${passUrl}\n\nTap the link from any device when you're ready to join!`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 24px; color: #334155;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <h2 style="font-size: 20px; color: #0f172a; margin-top: 0;">${greeting}</h2>
    <p style="font-size: 15px; line-height: 1.5; color: #475569;">Here is your personal link to enter your live ${programTitle} session:</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${passUrl}" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block;">Enter Live Session</a>
    </div>
    <p style="font-size: 13px; color: #94a3b8; word-break: break-all;">Or copy and paste this link into your browser:<br><a href="${passUrl}" style="color: #3b82f6;">${passUrl}</a></p>
  </div>
</body>
</html>`,
  };
}

/**
 * Enqueues a delivery task to deliveryQueue.
 * Sets a 15-minute TTL on the document to guarantee ephemeral lifetime.
 *
 * @param {object} params
 * @returns {Promise<string>} Created queue doc ID
 */
async function queueDelivery({ passId, type, contact, passUrl, adultName, programTitle, db, now }) {
  const database = db || admin.firestore();
  const timestamp = now ? now() : Date.now();
  const expiresAt = new Date(timestamp + 15 * 60 * 1000); // 15-minute TTL

  const queueRef = database.collection('deliveryQueue').doc();
  await queueRef.set({
    passId: passId || null,
    type,
    contact: contact || null,
    passUrl: passUrl || null,
    adultName: adultName || null,
    programTitle: programTitle || 'Music Fun with My Little One',
    status: 'pending',
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  });

  return queueRef.id;
}

/**
 * Processes a delivery queue record.
 * Executes SendGrid / Twilio delivery with retries, updates guestPasses telemetry,
 * and immediately deletes the queue doc on success.
 *
 * @param {object} data Queue document payload
 * @param {object} docRef DocumentReference
 * @param {object} [deps] Injected dependencies for testing
 */
async function processDeliveryQueueRecord(data, docRef, deps = {}) {
  if (!data) return;

  // 1. Dummy no-op handling for timing equalization
  if (data.type === 'noop' || data.status === 'noop') {
    if (docRef && docRef.delete) {
      await docRef.delete();
    }
    return;
  }

  const { passId, type, contact, passUrl, adultName, programTitle } = data;
  const db = deps.db || admin.firestore();
  const mailer = deps.sgMail || sgMail;
  const twilioClient = deps.twilioClient || null;
  const isProduction = process.env.NODE_ENV === 'production';

  const fv = admin.firestore.FieldValue;
  const now = deps.now ? deps.now() : Date.now();

  try {
    if (type === 'email') {
      const emailPayload = buildEmailMessage({ passUrl, adultName, contact, programTitle });
      if (mailer && (process.env.SENDGRID_API_KEY || functions.config().sendgrid?.key || deps.sgMail)) {
        await mailer.send(emailPayload);
      } else {
        if (isProduction) {
          throw new Error('SendGrid API key is not configured in production.');
        }
        console.log(`[Delivery] Dev/Test Email dispatched for ${contact}: ${passUrl}`);
      }
    } else if (type === 'phone') {
      const smsBody = buildSmsMessageBody({ passUrl, adultName });
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = process.env.TWILIO_FROM_PHONE;

      if (twilioClient) {
        await twilioClient.messages.create({
          body: smsBody,
          to: contact,
          from: fromPhone || '+15005550006',
        });
      } else if (twilioSid && twilioAuth && fromPhone) {
        const twilio = require('twilio')(twilioSid, twilioAuth);
        await twilio.messages.create({
          body: smsBody,
          to: contact,
          from: fromPhone,
        });
      } else {
        if (isProduction) {
          throw new Error('Twilio SMS credentials are not configured in production (A2P 10DLC registration required).');
        }
        console.log(`[Delivery] Dev/Test SMS dispatched for ${contact}: ${smsBody}`);
      }
    }

    // 2. Success: Update pass doc telemetry & delete raw token queue record immediately
    if (passId) {
      try {
        await db.collection('guestPasses').doc(passId).update({
          deliveryStatus: 'delivered',
          lastDeliveryAt: fv.serverTimestamp(),
          lastDeliveryChannel: type === 'email' ? 'email' : 'sms',
          lastDeliveryError: null,
        });
      } catch (updateErr) {
        console.warn(`[Delivery] Warning updating pass telemetry for ${passId}:`, updateErr.message);
      }
    }

    if (docRef && docRef.delete) {
      await docRef.delete();
    }
  } catch (err) {
    const attempts = (data.attempts || 0) + 1;
    console.error(`[Delivery] Attempt ${attempts} failed for ${contact}:`, err.message);

    if (attempts < 3) {
      // Retry with exponential backoff
      if (docRef && docRef.update) {
        await docRef.update({
          attempts,
          status: 'pending_retry',
          lastError: err.message,
          nextAttemptAt: new Date(now + Math.pow(2, attempts) * 1000),
        });
      }
    } else {
      // Permanent failure after 3 attempts
      if (passId) {
        try {
          await db.collection('guestPasses').doc(passId).update({
            deliveryStatus: 'failed',
            lastDeliveryAt: fv.serverTimestamp(),
            lastDeliveryChannel: type === 'email' ? 'email' : 'sms',
            lastDeliveryError: err.message,
          });
        } catch (updateErr) {
          console.warn(`[Delivery] Warning updating pass failure telemetry for ${passId}:`, updateErr.message);
        }
      }

      if (docRef && docRef.delete) {
        await docRef.delete();
      }
    }
  }
}

module.exports = {
  buildSmsMessageBody,
  buildEmailMessage,
  queueDelivery,
  processDeliveryQueueRecord,
};
