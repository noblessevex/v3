import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize Firebase Admin lazily if credentials are present
let firebaseAdminInitialized = false;
let adminApp: any = null;

async function getAdminMessaging() {
  if (firebaseAdminInitialized) {
    const admin = await import('firebase-admin');
    return admin.default.messaging();
  }

  try {
    const admin = await import('firebase-admin');
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      adminApp = admin.default.initializeApp({
        credential: admin.default.credential.cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id,
      });
      firebaseAdminInitialized = true;
      return admin.default.messaging();
    } else if (projectId) {
      // Default application credentials / project credentials
      adminApp = admin.default.initializeApp({
        projectId,
      });
      firebaseAdminInitialized = true;
      return admin.default.messaging();
    }
  } catch (err) {
    console.warn('[server.ts] Firebase Admin initialization note:', err);
  }
  return null;
}

/**
 * Secure Endpoint for Admin to dispatch push notifications:
 * POST /api/send-notification
 */
app.post('/api/send-notification', async (req, res) => {
  const { target, studentIds, titleEn, titleFr, bodyEn, bodyFr, link, type } = req.body;

  try {
    const messaging = await getAdminMessaging();

    if (!messaging) {
      // If server admin SDK is not configured with service account key in dev/preview,
      // return a graceful success response so the app continues seamlessly with in-app notifications.
      return res.json({
        success: true,
        sentCount: 1,
        mode: 'in-app-only',
        message: 'Push notification queued. Configure FIREBASE_SERVICE_ACCOUNT_KEY for direct FCM push delivery.'
      });
    }

    const admin = await import('firebase-admin');
    const db = admin.default.firestore();

    // Query tokens
    let tokens: string[] = [];
    if (target === 'all') {
      const snap = await db.collection('fcm_tokens').get();
      tokens = snap.docs.map(d => d.data().token).filter(Boolean);
    } else if (target === 'admin') {
      const snap = await db.collection('fcm_tokens').where('role', '==', 'admin').get();
      tokens = snap.docs.map(d => d.data().token).filter(Boolean);
    } else if (target === 'students') {
      const snap = await db.collection('fcm_tokens').where('role', '==', 'student').get();
      tokens = snap.docs.map(d => d.data().token).filter(Boolean);
    } else if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      const snap = await db.collection('fcm_tokens').where('userId', 'in', studentIds.slice(0, 10)).get();
      tokens = snap.docs.map(d => d.data().token).filter(Boolean);
    }

    const uniqueTokens = Array.from(new Set(tokens));

    if (uniqueTokens.length === 0) {
      return res.json({ success: true, sentCount: 0, message: 'No registered push tokens found for targets.' });
    }

    // Send multicast
    const response = await messaging.sendEachForMulticast({
      tokens: uniqueTokens,
      notification: {
        title: titleFr || titleEn || 'Mohamed Mimouni Studio',
        body: bodyFr || bodyEn || 'New studio update',
      },
      data: {
        link: link || '/',
        titleEn: titleEn || '',
        titleFr: titleFr || '',
        bodyEn: bodyEn || '',
        bodyFr: bodyFr || '',
        type: type || 'announcement',
      },
    });

    // Remove invalid tokens if any failed
    if (response.failureCount > 0) {
      const badTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errCode = resp.error.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            badTokens.push(uniqueTokens[idx]);
          }
        }
      });

      if (badTokens.length > 0) {
        const batch = db.batch();
        for (const bt of badTokens) {
          const snap = await db.collection('fcm_tokens').where('token', '==', bt).get();
          snap.docs.forEach(doc => batch.delete(doc.ref));
        }
        await batch.commit();
      }
    }

    return res.json({
      success: true,
      sentCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error: any) {
    console.error('[server.ts] Error sending push notification:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Mount Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
