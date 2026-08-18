const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

// Create a new post
const createPost = async (req, res) => {
  try {
    const db = getDB();

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const post = {
      userId: new ObjectId(req.user.id),
      image: req.file.path,
      caption: req.body.caption || "",
      likes: [],
      createdAt: new Date(),
    };

    const result = await db.collection("posts").insertOne(post);

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      postId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all posts
const getAllPosts = async (req, res) => {
  try {
    const db = getDB();

     const posts = await db
  .collection("posts")
  .aggregate([
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    {
      $project: {
        image: 1,
        caption: 1,
        likes: 1,
        createdAt: 1,

        user: {
          _id: "$user._id",
          fullName: "$user.fullName",
          username: "$user.username",
          profilePicture: "$user.profilePicture",
        },
      },
    },

    { $sort: { createdAt: -1 } },
  ])
  .toArray();

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete own post
const deletePost = async (req, res) => {
  try {
    const db = getDB();

    const post = await db.collection("posts").findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await db.collection("posts").deleteOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  deletePost,
};