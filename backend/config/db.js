const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  await client.connect();
  db = client.db("Swish");
  console.log("MongoDB connected successfully");

  await db.collection("posts").createIndex({ createdAt: -1 });
}

function getUserCollec() {
  if (!db) throw new Error("Database not connected yet");
  return db.collection("users");
}

function getPostCollec() {
  if (!db) throw new Error("Database not connected yet");
  return db.collection("posts");
}

module.exports = { connectDB, getUserCollec, getPostCollec };