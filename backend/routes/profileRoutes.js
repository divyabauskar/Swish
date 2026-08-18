 const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  getProfile,
  updateProfile,
} = require("../controllers/profileController");

// Get profile
router.get("/", authMiddleware, getProfile);

// Update profile with secure image validation
router.put("/update", authMiddleware, (req, res) => {
  upload.single("profilePicture")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    updateProfile(req, res);
  });
});

module.exports = router;