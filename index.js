var http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb'); // Import MongoDB client

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
        const result = await usersCollection.insertOne(user); // Insert user into MongoDB
        const createdUser = await usersCollection.findOne({ _id: result.insertedId }); // Fetch the created user
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(createdUser)); // Return the created user
      });
    } else if (method === 'GET' && urlParts[1] === 'users') {
      // Read all users
      const users = await usersCollection.find().toArray(); // Fetch all users from MongoDB
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(users));
    } else if (method === 'GET' && urlParts[1] === 'users' && urlParts[2]) {
      // Read a single user by ID
      const userId = urlParts[2];
      const user = await usersCollection.findOne({ _id: new MongoClient.ObjectId(userId) }); // Fetch user by ID
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
          { _id: new MongoClient.ObjectId(userId) },
          { $set: updatedUser }
        ); // Update user in MongoDB
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
      const result = await usersCollection.deleteOne({ _id: new MongoClient.ObjectId(userId) }); // Delete user from MongoDB
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
