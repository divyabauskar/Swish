require("dotenv").config();

let express = require("express");
let cors = require("cors");
let cookieParser = require("cookie-parser");
let bcrypt = require("bcryptjs");
let jwt = require("jsonwebtoken");
let { ObjectId } = require("mongodb");
let { connectDB, getUserCollec, getPostCollec } = require("./config/db");

let app = express();
let SECRET = process.env.JWT_SECRET;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

function auth(req, res, next) {
  let token = req.cookies.token;
  if (!token) return res.status(401).send("Not logged in");

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).send("Invalid token");
    req.user = decoded;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "Admin") {
    return res.status(403).send("Admin access only");
  }
  next();
}

function requireFacultyOrAdmin(req, res, next) {
  if (req.user.role !== "Admin" && req.user.role !== "Faculty") {
    return res.status(403).send("Faculty or Admin access only");
  }
  next();
}

app.post("/register", async (req, res) => {
  try {
    const userCollec = getUserCollec();
    req.body.password = bcrypt.hashSync(req.body.password, 10);
    req.body.accountStatus = req.body.role === "Faculty" ? "pending" : "active";
    await userCollec.insertOne(req.body);
    res.send("Signup successful");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/login", async (req, res) => {
  try {
    const userCollec = getUserCollec();
    let { email, password } = req.body;

    let obj = await userCollec.findOne({ email });
    if (!obj) return res.status(400).send("User not found");

    let ok = bcrypt.compareSync(password, obj.password);
    if (!ok) return res.status(400).send("Password incorrect");

    if (obj.role === "Faculty" && obj.accountStatus === "pending") {
      return res.status(403).send("Your account is pending admin approval");
    }

    if (obj.accountStatus === "suspended") {
      return res.status(403).send("Your account has been suspended");
    }

    let token = jwt.sign({ id: obj._id, role: obj.role }, SECRET, { expiresIn: "1d" });
    res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });

    res.send({ message: "Login Successful", role: obj.role });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/profile", auth, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    let _id = new ObjectId(req.user.id);
    let obj = await userCollec.findOne({ _id }, { projection: { password: 0 } });
    res.send(obj);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.send("Logged out successfully");
});

app.get("/admin/students", auth, requireFacultyOrAdmin, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    let filter = { role: "Student" };
    if (req.query.department) filter.department = req.query.department;
    if (req.query.status) filter.accountStatus = req.query.status;

    let students = await userCollec.find(filter, { projection: { password: 0 } }).toArray();
    res.send(students);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/admin/faculty", auth, requireAdmin, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    let filter = { role: "Faculty" };
    if (req.query.status) filter.accountStatus = req.query.status;
    if (req.query.department) filter.department = req.query.department;

    let faculty = await userCollec.find(filter, { projection: { password: 0 } }).toArray();
    res.send(faculty);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.patch("/admin/approve/:id", auth, requireAdmin, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    let _id = new ObjectId(req.params.id);
    await userCollec.updateOne({ _id }, { $set: { accountStatus: "active" } });
    res.send("Faculty approved successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.patch("/admin/suspend/:id", auth, requireFacultyOrAdmin, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    let _id = new ObjectId(req.params.id);

    if (req.user.role === "Faculty") {
      let target = await userCollec.findOne({ _id });
      if (!target || target.role !== "Student") {
        return res.status(403).send("Faculty can only suspend student accounts");
      }
    }

    await userCollec.updateOne({ _id }, { $set: { accountStatus: "suspended" } });
    res.send("Suspended Successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.patch("/admin/reactivate/:id", auth, requireFacultyOrAdmin, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    let _id = new ObjectId(req.params.id);

    if (req.user.role === "Faculty") {
      let target = await userCollec.findOne({ _id });
      if (!target || target.role !== "Student") {
        return res.status(403).send("Faculty can only reactivate student accounts");
      }
    }

    await userCollec.updateOne({ _id }, { $set: { accountStatus: "active" } });
    res.send("Reactivated Successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.patch("/admin/promote/:id", auth, requireAdmin, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    let _id = new ObjectId(req.params.id);
    await userCollec.updateOne({ _id }, { $set: { role: "Admin" } });
    res.send("Faculty Promoted To Admin Successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.patch("/profile/update", auth, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    let _id = new ObjectId(req.user.id);

    let allowedUpdates = {};
    if (req.body.profilePhoto) allowedUpdates.profilePhoto = req.body.profilePhoto;
    if (req.body.fullname) allowedUpdates.fullname = req.body.fullname;
    if (req.body.bio !== undefined) allowedUpdates.bio = req.body.bio;
    if (req.body.department) allowedUpdates.department = req.body.department;
    if (req.body.year) allowedUpdates.year = req.body.year;

    await userCollec.updateOne({ _id }, { $set: allowedUpdates });
    res.send("Profile updated successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post(["/createPost", "/post"], auth, async (req, res) => {
  try {
    const postCollec = getPostCollec();
    const userCollec = getUserCollec();

    if (!req.user?.id || !ObjectId.isValid(req.user.id)) {
      return res.status(401).send("Invalid user session. Please log in again.");
    }

    const authorObjectId = new ObjectId(req.user.id);
    const authorUser = await userCollec.findOne({ _id: authorObjectId });

    const caption = req.body.caption?.trim() || "";
    const title = req.body.title?.trim() || "";

    if (!caption && !req.body.images?.length && !req.body.image) {
      return res.status(400).send("Post must contain text or at least one image.");
    }

    const newPost = {
      title,
      caption,
      category: req.body.category || "general",
      location: req.body.location || "",
      driveLink: req.body.driveLink || "",
      images: req.body.images || (req.body.image ? [req.body.image] : []),
      song: req.body.song || "",
      poll: req.body.poll || null,
      archived: false,
      authorId: authorObjectId,
      authorName: authorUser?.fullname || "Campus User",
      authorPhoto: authorUser?.profilePhoto || "",
      authorRole: authorUser?.role || req.user.role || "Student",
      createdAt: new Date(),
    };

    const result = await postCollec.insertOne(newPost);
    res.status(201).json({ ...newPost, _id: result.insertedId });
  } catch (err) {
    console.error(">>> ERROR CREATING POST:", err);
    res.status(500).send(err.message);
  }
});

app.get(["/getPosts", "/post"], auth, async (req, res) => {
  try {
    const postCollec = getPostCollec();
    const posts = await postCollec.find({ archived: { $ne: true } }).sort({ createdAt: -1 }).toArray();
    res.send(posts);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete(["/deletePost/:id", "/post/:id"], auth, async (req, res) => {
  try {
    const postCollec = getPostCollec();
    const postId = new ObjectId(req.params.id);

    const post = await postCollec.findOne({ _id: postId });
    if (!post) return res.status(404).send("Post not found");

    const isAuthor = post.authorId?.toString() === req.user.id;
    const isAdmin = req.user.role === "Admin";
    if (!isAuthor && !isAdmin) {
      return res.status(403).send("Not authorized to delete this post");
    }

    await postCollec.deleteOne({ _id: postId });
    res.send("Post deleted successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.patch(["/archivePost/:id", "/post/:id/archive"], auth, async (req, res) => {
  try {
    const postCollec = getPostCollec();
    const postId = new ObjectId(req.params.id);

    const post = await postCollec.findOne({ _id: postId });
    if (!post) return res.status(404).send("Post not found");

    const isAuthor = post.authorId?.toString() === req.user.id;
    if (!isAuthor) return res.status(403).send("Not authorized to archive this post");

    await postCollec.updateOne({ _id: postId }, { $set: { archived: true } });
    res.send("Post archived successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.patch("/post/:id/like", auth, async (req, res) => {
  try {
    const postCollec = getPostCollec();
    const postId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.id);

    const post = await postCollec.findOne({ _id: postId });
    if (!post) return res.status(404).send("Post not found");

    const likes = post.likes || [];
    const alreadyLiked = likes.some((id) => id.toString() === req.user.id);

    if (alreadyLiked) {
      await postCollec.updateOne({ _id: postId }, { $pull: { likes: userId } });
    } else {
      await postCollec.updateOne({ _id: postId }, { $addToSet: { likes: userId } });
    }

    const updated = await postCollec.findOne({ _id: postId });
    res.send({ liked: !alreadyLiked, likeCount: updated.likes?.length || 0 });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/post/:id/comment", auth, async (req, res) => {
  try {
    const postCollec = getPostCollec();
    const userCollec = getUserCollec();
    const postId = new ObjectId(req.params.id);

    const text = req.body.text?.trim();
    if (!text) return res.status(400).send("Comment text is required");

    const authorUser = await userCollec.findOne({ _id: new ObjectId(req.user.id) });

    const newComment = {
      _id: new ObjectId(),
      authorId: new ObjectId(req.user.id),
      authorName: authorUser?.fullname || "Campus User",
      text,
      createdAt: new Date(),
    };

    await postCollec.updateOne({ _id: postId }, { $push: { comments: newComment } });
    res.status(201).send(newComment);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete("/post/:postId/comment/:commentId", auth, async (req, res) => {
  try {
    const postCollec = getPostCollec();
    const postId = new ObjectId(req.params.postId);
    const commentId = new ObjectId(req.params.commentId);

    const post = await postCollec.findOne({ _id: postId });
    if (!post) return res.status(404).send("Post not found");

    const comment = (post.comments || []).find((c) => c._id?.toString() === req.params.commentId);
    if (!comment) return res.status(404).send("Comment not found");

    const isCommentAuthor = comment.authorId?.toString() === req.user.id;
    const isPostAuthor = post.authorId?.toString() === req.user.id;
    const isAdmin = req.user.role === "Admin";
    if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
      return res.status(403).send("Not authorized to delete this comment");
    }

    await postCollec.updateOne({ _id: postId }, { $pull: { comments: { _id: commentId } } });
    res.send("Comment deleted");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/admin/posts", auth, requireAdmin, async (req, res) => {
  try {
    const postCollec = getPostCollec();
    const posts = await postCollec.find({}).sort({ createdAt: -1 }).toArray();
    res.send(posts);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

connectDB()
  .then(() => {
    app.listen(3000, () => console.log("Server running on 3000"));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });