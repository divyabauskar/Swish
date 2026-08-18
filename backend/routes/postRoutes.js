 const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  createPost,
  getAllPosts,
  deletePost,
} = require("../controllers/postController");

router.get("/", getAllPosts);

 router.post("/create", authMiddleware, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    createPost(req, res);
  });
});

router.delete("/:id", authMiddleware, deletePost);

module.exports = router;