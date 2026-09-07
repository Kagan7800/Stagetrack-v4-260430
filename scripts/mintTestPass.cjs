'use strict';

const path = require('path');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.APP_BASE_URL = 'http://127.0.0.1:5000';

const admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'));
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'stagetrack-v4-260430-461-92681' });
}
const db = admin.firestore();

const { createGuestPassHandler } = require(path.resolve(__dirname, '../functions/guestPasses'));

async function main() {
  // Ensure active session exists in emulator
  await db.collection('sessions').doc('session-hm898y4nq').set({
    programId: 'spring-2026',
    state: 'lobby_open',
    title: 'Music Fun Spring 2026 Live Session',
    createdAt: Date.now(),
  }, { merge: true });

  const context = {
    auth: {
      uid: 'instructor_local_dev',
      token: { instructor: true, admin: true },
    },
  };

  const result = await createGuestPassHandler(
    {
      programId: 'spring-2026',
      adultName: 'Sarah Jenkins',
      childNames: ['Leo', 'Maya'],
      email: 'sarah.jenkins@example.com',
      phone: '+15551234567',
    },
    context,
    { db }
  );

  // Print only the passUrl to stdout with no other output
  process.stdout.write(result.passUrl + '\n');
}

main().catch((err) => {
  process.stderr.write(String(err.stack || err) + '\n');
  process.exit(1);
});
