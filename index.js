var http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb'); // Import MongoDB client and ObjectId

const uri = 'mongodb://localhost:27017/users'; // Replace with your MongoDB connection string
const client = new MongoClient(uri);

async function startServer() {
  await client.connect(); // Connect to MongoDB
  const database = client.db('users'); // Replace with your database name
  const usersCollection = database.collection('users'); // Collection for users

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
        body += chunk.toString(); // Convert Buffer to string
      });
      req.on('end', async () => {
        const user = JSON.parse(body);
        // Store the password as is (not recommended for production)
        const result = await usersCollection.insertOne(user); // Insert user into MongoDB
        const createdUser = await usersCollection.findOne({ _id: result.insertedId });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(createdUser)); // Return the created user
      });
    } else if (method === 'POST' && urlParts[1] === 'login') {
      // Login user
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString(); // Convert Buffer to string
      });
      req.on('end', async () => {
        const { email, password } = JSON.parse(body);
        const user = await usersCollection.findOne({ email }); // Find user by email
        if (user && user.password === password) { // Check if passwords match
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Login successful', userId: user._id })); // Successful login
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Invalid email or password' })); // Invalid credentials
        }
      });
    } else if (method === 'GET' && urlParts[1] === 'users') {
      // Read all users
      const users = await usersCollection.find().toArray(); // Fetch all users from MongoDB
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(users));
    } else if (method === 'GET' && urlParts[1] === 'users' && urlParts[2]) {
      // Read a single user by ID
      const userId = urlParts[2];
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) }); // Use ObjectId directly
      if (user) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(user));
      } else {
        res.writeHead(404);
        res.end();
      }
    } else if (method === 'PUT' && urlParts[1] === 'users' && urlParts[2]) {
      // Update a user by ID
      const userId = urlParts[2];
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        const updatedUser = JSON.parse(body);
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(userId) }, // Use ObjectId directly
          { $set: updatedUser }
        );
        if (result.modifiedCount > 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updatedUser));
        } else {
          res.writeHead(404);
          res.end();
        }
      });
    } else if (method === 'DELETE' && urlParts[1] === 'users' && urlParts[2]) {
      // Delete a user by ID
      const userId = urlParts[2];
      const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) }); // Use ObjectId directly
      if (result.deletedCount > 0) {
        res.writeHead(204);
        res.end();
      } else {
        res.writeHead(404);
        res.end();
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  }).listen(80); // The server object listens on port 80
}

// Start the server
startServer().catch(console.error); // Call the function to start the server
