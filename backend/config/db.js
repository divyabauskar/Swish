const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  await client.connect();
  db = client.db("Swish"); 
  console.log("MongoDB connected successfully");
}

function getUserCollec() {
  if (!db) throw new Error("Database not connected yet");
  return db.collection("users");
}

module.exports = { connectDB, getUserCollec };