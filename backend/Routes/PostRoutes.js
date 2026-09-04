const express = require("express");
const PostController=require("../Controllers/PostController");
let router = express.Router(); 

router.post("/post", PostController.createPost);
router.get("/post", PostController.getPost);
router.delete("/post/:id", PostController.deletePost);

module.exports = router;
