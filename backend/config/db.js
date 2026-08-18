 const { MongoClient } = require("mongodb");
require("dotenv").config();
 
const client = new MongoClient(process.env.MONGODB_URI);

let db;

// Connect MongoDB
async function connectDB() {
  await client.connect();
  db = client.db("Swish");
  console.log("MongoDB connected successfully");
}

// 👇 ADD THIS FUNCTION HERE
function getDB() {
  if (!db) throw new Error("Database not connected yet");
  return db;
}

// Existing function
function getUserCollec() {
  if (!db) throw new Error("Database not connected yet");
  return db.collection("users");
}

// Update exports
module.exports = {
  connectDB,
  getDB,
  getUserCollec,
};