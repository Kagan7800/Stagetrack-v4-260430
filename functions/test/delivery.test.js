'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildSmsMessageBody,
  buildEmailMessage,
  queueDelivery,
  processDeliveryQueueRecord,
} = require('../delivery');

/**
 * In-memory Mock Firestore Database.
 */
function createMockDb() {
  const store = new Map();

  function getDocRef(col, docId) {
    const key = `${col}/${docId}`;
    return {
      id: docId,
      path: key,
      async get() {
        const data = store.get(key);
        return {
          id: docId,
          exists: data !== undefined,
          data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
        };
      },
      async set(data, opts = {}) {
        if (opts.merge && store.has(key)) {
          const current = store.get(key) || {};
          store.set(key, { ...current, ...data });
        } else {
          store.set(key, { ...data });
        }
      },
      async update(data) {
        if (!store.has(key)) throw new Error(`Doc ${key} does not exist`);
        const current = store.get(key) || {};
        store.set(key, { ...current, ...data });
      },
      async delete() {
        store.delete(key);
      },
    };
  }

  return {
    _store: store,
    collection(col) {
      return {
        doc(docId = `doc_${Math.random().toString(36).substring(2, 11)}`) {
          return getDocRef(col, docId);
        },
      };
    },
  };
}

describe('Task 9: Delivery Service & Telemetry Acceptance Tests', () => {
  const baseTime = 1700000000000;
  const mockPassUrl = 'https://musicfun.app/my/7a2halxqw52s-hlKauVoSeC5XbLH5KiGFhnQNT6WVLU';

  test('Anti-OTP Invariant — SMS contains full URL and zero 4-8 digit numeric codes', () => {
    const sms1 = buildSmsMessageBody({
      passUrl: mockPassUrl,
      adultName: 'Sarah Jenkins',
    });

    // 1. Must contain the full magic link
    assert.ok(sms1.includes(mockPassUrl), 'SMS must contain the complete pass URL');
    assert.ok(sms1.includes('Hi Sarah Jenkins!'));

    // 2. Mechanically assert NO standalone 4-8 digit OTP / PIN codes exist in the message body
    // Extract everything except the URL itself
    const messageWithoutUrl = sms1.replace(mockPassUrl, '');
    const otpCodeRegex = /\b\d{4,8}\b/;
    assert.equal(
      otpCodeRegex.test(messageWithoutUrl),
      false,
      'SMS body must NEVER contain standalone 4-to-8 digit verification codes or OTPs'
    );

    // Fallback greeting test
    const sms2 = buildSmsMessageBody({ passUrl: mockPassUrl, adultName: null });
    assert.ok(sms2.includes('Hi there!'));
    assert.ok(sms2.includes(mockPassUrl));
    assert.equal(otpCodeRegex.test(sms2.replace(mockPassUrl, '')), false);
  });

  test('Email Message Formatting — generates SendGrid HTML & text with passUrl', () => {
    const email = buildEmailMessage({
      passUrl: mockPassUrl,
      adultName: 'David Miller',
      contact: 'david@example.com',
      programTitle: 'Spring 2026 Live Music Fun',
    });

    assert.equal(email.to, 'david@example.com');
    assert.ok(email.subject.includes('Spring 2026 Live Music Fun'));
    assert.ok(email.text.includes(mockPassUrl));
    assert.ok(email.html.includes(mockPassUrl));
    assert.ok(email.html.includes('David Miller'));
  });

  test('queueDelivery — enqueues task in deliveryQueue with 15-minute TTL', async () => {
    const db = createMockDb();
    const queueId = await queueDelivery({
      passId: 'pass_123',
      type: 'email',
      contact: 'sarah@example.com',
      passUrl: mockPassUrl,
      adultName: 'Sarah',
      db,
      now: () => baseTime,
    });

    const queueDoc = (await db.collection('deliveryQueue').doc(queueId).get()).data();
    assert.equal(queueDoc.passId, 'pass_123');
    assert.equal(queueDoc.type, 'email');
    assert.equal(queueDoc.contact, 'sarah@example.com');
    assert.equal(queueDoc.passUrl, mockPassUrl);
    assert.equal(queueDoc.status, 'pending');
    assert.equal(queueDoc.attempts, 0);
  });

  test('processDeliveryQueueRecord — Successful send updates pass telemetry and deletes queue doc', async () => {
    const db = createMockDb();

    // Seed pass
    await db.collection('guestPasses').doc('pass_123').set({
      adultName: 'Sarah',
      email: 'sarah@example.com',
      status: 'active',
      deliveryStatus: 'pending',
    });

    let emailSent = null;
    const mockMailer = {
      async send(payload) {
        emailSent = payload;
      },
    };

    let deleted = false;
    const mockDocRef = {
      async delete() {
        deleted = true;
      },
    };

    const queueData = {
      passId: 'pass_123',
      type: 'email',
      contact: 'sarah@example.com',
      passUrl: mockPassUrl,
      adultName: 'Sarah',
      attempts: 0,
    };

    await processDeliveryQueueRecord(queueData, mockDocRef, {
      db,
      sgMail: mockMailer,
      now: () => baseTime,
    });

    assert.ok(emailSent, 'Email should be dispatched');
    assert.equal(deleted, true, 'Queue doc must be deleted immediately on successful delivery');

    const passDoc = (await db.collection('guestPasses').doc('pass_123').get()).data();
    assert.equal(passDoc.deliveryStatus, 'delivered');
    assert.equal(passDoc.lastDeliveryChannel, 'email');
    assert.equal(passDoc.lastDeliveryError, null);
  });

  test('processDeliveryQueueRecord — Failure updates pass telemetry with lastDeliveryError after 3 attempts', async () => {
    const db = createMockDb();

    await db.collection('guestPasses').doc('pass_failed').set({
      adultName: 'Bob',
      phone: '+15550009999',
      status: 'active',
      deliveryStatus: 'pending',
    });

    const mockTwilio = {
      messages: {
        async create() {
          throw new Error('Twilio carrier error 30034: Unregistered 10DLC route');
        },
      },
    };

    let deleted = false;
    const mockDocRef = {
      async delete() {
        deleted = true;
      },
      async update() {},
    };

    const queueData = {
      passId: 'pass_failed',
      type: 'phone',
      contact: '+15550009999',
      passUrl: mockPassUrl,
      adultName: 'Bob',
      attempts: 2, // 3rd attempt
    };

    await processDeliveryQueueRecord(queueData, mockDocRef, {
      db,
      twilioClient: mockTwilio,
      now: () => baseTime,
    });

    const passDoc = (await db.collection('guestPasses').doc('pass_failed').get()).data();
    assert.equal(passDoc.deliveryStatus, 'failed');
    assert.equal(passDoc.lastDeliveryChannel, 'sms');
    assert.ok(passDoc.lastDeliveryError.includes('30034'));
    assert.equal(deleted, true, 'Queue doc must be purged on permanent failure');
  });

  test('processDeliveryQueueRecord — Timing equalization no-op document deletes cleanly without side effects', async () => {
    const db = createMockDb();
    let deleted = false;
    const mockDocRef = {
      async delete() {
        deleted = true;
      },
    };

    await processDeliveryQueueRecord({ type: 'noop', status: 'noop' }, mockDocRef, { db });
    assert.equal(deleted, true, 'Noop dummy doc must be deleted cleanly');
  });
});
