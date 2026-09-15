const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  await client.connect();
  db = client.db("Swish");
  console.log("MongoDB connected successfully");

  await db.collection("posts").createIndex({ createdAt: -1 });
  await db.collection("follows").createIndex({ followerId: 1, followingId: 1 }, { unique: true });
  await db.collection("follows").createIndex({ followingId: 1, status: 1 });
  await db.collection("follows").createIndex({ followerId: 1, status: 1 });
  await db.collection("notifications").createIndex({ recipientId: 1, createdAt: -1 });
}

function getUserCollec() {
  if (!db) throw new Error("Database not connected yet");
  return db.collection("users");
}

function getPostCollec() {
  if (!db) throw new Error("Database not connected yet");
  return db.collection("posts");
}

function getFollowCollec() {
  if (!db) throw new Error("Database not connected yet");
  return db.collection("follows");
}

function getNotifCollec() {
  if (!db) throw new Error("Database not connected yet");
  return db.collection("notifications");
}

module.exports = { connectDB, getUserCollec, getPostCollec, getFollowCollec, getNotifCollec };