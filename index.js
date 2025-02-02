var http = require('http');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
try {
  const firebaseConfig = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
  };
  
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig)
  });
  
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  process.exit(1);
}

const db = admin.firestore();
const usersCollection = db.collection('users');

// Create a server object:
http.createServer(async function (req, res) {
  const urlParts = req.url.split('/');
  const method = req.method;

  if (method === 'GET' && req.url === '/') {
    // Serve the HTML page
    fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
  } else if (method === 'POST' && urlParts[1] === 'users') {
    // Create a new user
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const user = JSON.parse(body);
      try {
        const docRef = await usersCollection.add(user);
        const createdUser = await docRef.get();
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: docRef.id, ...createdUser.data() }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else if (method === 'POST' && urlParts[1] === 'login') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const { email, password } = JSON.parse(body);
      try {
        const snapshot = await usersCollection.where('email', '==', email).get();
        if (!snapshot.empty) {
          const user = snapshot.docs[0];
          if (user.data().password === password) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Login successful', userId: user.id }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Invalid email or password' }));
          }
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Invalid email or password' }));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else if (method === 'GET' && urlParts[1] === 'users') {
    try {
      const snapshot = await usersCollection.get();
      const users = [];
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(users));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else if (method === 'GET' && urlParts[1] === 'users' && urlParts[2]) {
    const userId = urlParts[2];
    try {
      const doc = await usersCollection.doc(userId).get();
      if (doc.exists) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: doc.id, ...doc.data() }));
      } else {
        res.writeHead(404);
        res.end();
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else if (method === 'PUT' && urlParts[1] === 'users' && urlParts[2]) {
    const userId = urlParts[2];
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const updatedUser = JSON.parse(body);
      try {
        await usersCollection.doc(userId).update(updatedUser);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: userId, ...updatedUser }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else if (method === 'DELETE' && urlParts[1] === 'users' && urlParts[2]) {
    const userId = urlParts[2];
    try {
      await usersCollection.doc(userId).delete();
      res.writeHead(204);
      res.end();
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(80, () => {
  console.log('Server is running on http://localhost:80');
  console.log('Firebase Admin SDK initialized successfully');
});
