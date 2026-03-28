const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
  } catch (error) {
    console.error('Firebase Admin init error (check env FIREBASE_SERVICE_ACCOUNT):', error);
  }
}

module.exports = async function handler(req, res) {
  // Setup standard CORS framework headers for React access
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { bloodGroup, requesterName, location, note } = req.body;

  if (!bloodGroup) {
    return res.status(400).json({ error: 'Missing bloodGroup in request.' });
  }

  try {
    const db = admin.firestore();
    
    // Find users with the selected bloodGroup who opted into app notifications
    const snapshot = await db.collection('users')
      .where('group', '==', bloodGroup)
      .get();
      
    const tokens = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
      }
    });

    if (tokens.length === 0) {
      return res.status(200).json({ message: 'No registered devices found for this blood group.', count: 0 });
    }

    const message = {
      notification: {
        title: `Urgent: ${bloodGroup} Blood Needed!`,
        body: `${requesterName} urgently needs ${bloodGroup} blood at ${location}. ${note ? `Note: ${note}` : ''}`,
      },
      tokens: tokens,
    };

    // Firebase Multicast handles pushing to hundreds/thousands of tokens concurrently in milliseconds
    const response = await admin.messaging().sendEachForMulticast(message);
    
    return res.status(200).json({ 
      success: true, 
      sentCount: response.successCount, 
      failedCount: response.failureCount 
    });

  } catch (error) {
    console.error('Error sending push notification:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
