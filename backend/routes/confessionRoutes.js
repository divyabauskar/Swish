const express = require("express");
const router = express.Router();

const {
  createConfession,
  getConfessions,
} = require("../controllers/confessionController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", getConfessions);

 router.post("/create", authMiddleware, createConfession);
 
module.exports = router;