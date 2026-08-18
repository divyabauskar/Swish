const { getDB } = require("../config/db");

// Create Anonymous Confession
const createConfession = async (req, res) => {
  try {
    const db = getDB();

    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Confession cannot be empty",
      });
    }

    const confession = {
      text,
      isAnonymous: true,
      createdAt: new Date(),
    };

    await db.collection("confessions").insertOne(confession);

    res.status(201).json({
      success: true,
      message: "Confession posted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Get All Confessions
const getConfessions = async (req, res) => {
  try {
    const db = getDB();

    const confessions = await db
      .collection("confessions")
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      confessions,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  createConfession,
  getConfessions,
};