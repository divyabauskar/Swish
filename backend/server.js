require("dotenv").config();

let express = require("express");
let cors = require("cors");
let cookieParser = require("cookie-parser");
let bcrypt = require("bcryptjs");
let jwt = require("jsonwebtoken");
let { ObjectId } = require("mongodb");
let { connectDB, getUserCollec, getPostCollec, getFollowCollec, getNotifCollec } = require("./config/db");

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

async function syncUserFollowCounts(userId) {
  try {
    const followCollec = getFollowCollec();
    const userCollec = getUserCollec();
    const uId = new ObjectId(userId);

    const followerCount = await followCollec.countDocuments({
      followingId: { $in: [uId, uId.toString()] },
      status: "accepted",
    });
    const followingCount = await followCollec.countDocuments({
      followerId: { $in: [uId, uId.toString()] },
      status: "accepted",
    });

    await userCollec.updateOne(
      { _id: uId },
      {
        $set: {
          followerCount,
          followingCount,
          followers: followerCount,
          following: followingCount,
        },
      }
    );

    return { followerCount, followingCount };
  } catch (err) {
    console.error("Error syncing follow counts for user:", userId, err);
    return { followerCount: 0, followingCount: 0 };
  }
}

app.get("/profile", auth, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    const postCollec = getPostCollec();

    let _id = new ObjectId(req.user.id);
    const { followerCount, followingCount } = await syncUserFollowCounts(_id);
    let obj = await userCollec.findOne({ _id }, { projection: { password: 0 } });
    if (!obj) return res.status(404).send("User not found");

    const postCount = await postCollec.countDocuments({ authorId: _id, archived: { $ne: true } });

    res.send({ ...obj, followerCount, followingCount, following: followingCount, followers: followerCount, postCount, relationshipStatus: "self" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/profile/:userId", auth, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    const followCollec = getFollowCollec();
    const postCollec = getPostCollec();

    if (!ObjectId.isValid(req.params.userId)) {
      return res.status(400).send("Invalid user ID");
    }

    const targetId = new ObjectId(req.params.userId);
    const currentUserId = new ObjectId(req.user.id);

    const { followerCount, followingCount } = await syncUserFollowCounts(targetId);
    const user = await userCollec.findOne({ _id: targetId }, { projection: { password: 0 } });
    if (!user) return res.status(404).send("User not found");

    const postCount = await postCollec.countDocuments({ authorId: targetId, archived: { $ne: true } });

    let relationshipStatus = "none";
    if (req.user.id === req.params.userId) {
      relationshipStatus = "self";
    } else {
      const followDoc = await followCollec.findOne({
        followerId: { $in: [currentUserId, req.user.id] },
        followingId: { $in: [targetId, req.params.userId] },
      });
      if (followDoc) {
        if (followDoc.status === "accepted") relationshipStatus = "following";
        else if (followDoc.status === "pending") relationshipStatus = "requested";
      } else {
        const reverseDoc = await followCollec.findOne({
          followerId: { $in: [targetId, req.params.userId] },
          followingId: { $in: [currentUserId, req.user.id] },
          status: "accepted",
        });
        if (reverseDoc) relationshipStatus = "follow_back";
      }
    }

    res.send({ ...user, followerCount, followingCount, following: followingCount, followers: followerCount, postCount, relationshipStatus });
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

// EXPLORE: Trending Helpers & Endpoints

async function getTrendingPosts(limit = 25) {
  const postCollec = getPostCollec();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentEligible = await postCollec
    .find({
      archived: { $ne: true },
      authorId: { $exists: true, $ne: null },
      createdAt: { $gte: sevenDaysAgo },
    })
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();

  const scored = recentEligible.map((post) => {
    const likes = post.likes?.length || 0;
    const comments = post.comments?.length || 0;
    const hoursSincePosted = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / 36e5);
    const engagement = likes + comments * 2;
    const trendScore = engagement / Math.pow(hoursSincePosted + 2, 1.5);
    return { ...post, engagement, trendScore };
  });

  const withEngagement = scored.filter((p) => p.engagement > 0);

  const TRENDING_PERCENTILE = 0.7; // top 30% of posts that have any engagement
  const engagementValues = withEngagement.map((p) => p.engagement).sort((a, b) => a - b);
  const percentileIndex = Math.floor(engagementValues.length * TRENDING_PERCENTILE);
  const dynamicEngagementThreshold = engagementValues[percentileIndex] ?? 0;

  return withEngagement
    .filter((p) => p.engagement >= dynamicEngagementThreshold)
    .sort((a, b) => b.trendScore - a.trendScore || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map(({ engagement, trendScore, ...p }) => ({ ...p, isTrending: true }));
}

async function getTrendingPeople(currentUserId, limit = 15) {
  const userCollec = getUserCollec();
  const followCollec = getFollowCollec();
  const postCollec = getPostCollec();
  const cUserId = new ObjectId(currentUserId);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const authorStats = await postCollec
    .aggregate([
      { $match: { archived: { $ne: true } } },
      {
        $group: {
          _id: "$authorId",
          totalLikes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
          totalComments: { $sum: { $size: { $ifNull: ["$comments", []] } } },
          postCount: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const statsMap = new Map();
  authorStats.forEach((s) => {
    statsMap.set(s._id.toString(), {
      totalLikes: s.totalLikes,
      totalComments: s.totalComments,
      postCount: s.postCount,
      engagement: s.totalLikes + s.totalComments * 2,
    });
  });

  const followerAgg = await followCollec
    .aggregate([
      { $match: { status: "accepted" } },
      {
        $group: {
          _id: { $toString: "$followingId" },
          followerCount: { $sum: 1 },
          recentGrowth: { $sum: { $cond: [{ $gte: ["$updatedAt", sevenDaysAgo] }, 1, 0] } },
        },
      },
    ])
    .toArray();

  const followerMap = new Map();
  followerAgg.forEach((f) =>
    followerMap.set(f._id, { followerCount: f.followerCount, recentGrowth: f.recentGrowth })
  );

  const users = await userCollec
    .find({ _id: { $ne: cUserId }, accountStatus: { $ne: "suspended" } }, { projection: { password: 0 } })
    .toArray();

  const candidates = users.map((user) => {
    const idStr = user._id.toString();
    const followData = followerMap.get(idStr) || { followerCount: 0, recentGrowth: 0 };
    const stats = statsMap.get(idStr) || { totalLikes: 0, totalComments: 0, postCount: 0, engagement: 0 };
    return { ...user, ...followData, ...stats };
  });

  const growingCandidates = candidates.filter((u) => u.recentGrowth > 0);

  const TRENDING_PERCENTILE = 0.7; // top 30% of users who are growing at all
  const growthValues = growingCandidates.map((u) => u.recentGrowth).sort((a, b) => a - b);
  const percentileIndex = Math.floor(growthValues.length * TRENDING_PERCENTILE);
  const dynamicGrowthThreshold = growthValues[percentileIndex] ?? 0;

  const trendingCandidates = growingCandidates.filter(
    (u) => u.recentGrowth >= dynamicGrowthThreshold
  );

  trendingCandidates.sort((a, b) => {
    if (b.recentGrowth !== a.recentGrowth) return b.recentGrowth - a.recentGrowth;
    if (b.followerCount !== a.followerCount) return b.followerCount - a.followerCount;
    return b.engagement - a.engagement;
  });

  const topCandidates = trendingCandidates.slice(0, limit);
  const topCandidateIds = topCandidates.map((u) => u._id);
  const topCandidateIdsStr = topCandidates.map((u) => u._id.toString());

  const myFollows = await followCollec
    .find({
      followerId: { $in: [cUserId, cUserId.toString()] },
      followingId: { $in: [...topCandidateIds, ...topCandidateIdsStr] },
    })
    .toArray();

  const theirFollows = await followCollec
    .find({
      followerId: { $in: [...topCandidateIds, ...topCandidateIdsStr] },
      followingId: { $in: [cUserId, cUserId.toString()] },
      status: "accepted",
    })
    .toArray();

  const myFollowMap = new Map();
  myFollows.forEach((f) => myFollowMap.set(f.followingId.toString(), f.status));

  const theirFollowSet = new Set();
  theirFollows.forEach((f) => theirFollowSet.add(f.followerId.toString()));

  return topCandidates.map((user) => {
    const uId = user._id.toString();
    const myStatus = myFollowMap.get(uId);
    let relationshipStatus = "none";
    if (myStatus === "accepted") relationshipStatus = "following";
    else if (myStatus === "pending") relationshipStatus = "requested";
    else if (theirFollowSet.has(uId)) relationshipStatus = "follow_back";
    return { ...user, relationshipStatus };
  });
}

app.get("/explore/trending", auth, async (req, res) => {
  try {
    const [trendingPeople, trendingPosts] = await Promise.all([
      getTrendingPeople(req.user.id, 15),
      getTrendingPosts(25),
    ]);
    res.send({ trendingPeople, trendingPosts });
  } catch (err) {
    console.error("Error in /explore/trending:", err);
    res.status(500).send(err.message);
  }
});

// Dedicated Trending Posts endpoint
app.get(["/explore/posts", "/api/posts/trending", "/api/posts/explore/trending"], auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const posts = await getTrendingPosts(limit);
    res.send(posts);
  } catch (err) {
    console.error("Error in explore trending posts:", err);
    res.status(500).send(err.message);
  }
});

app.get(["/explore/profiles", "/api/profiles/trending"], auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 15, 30);
    const profiles = await getTrendingPeople(req.user.id, limit);
    res.send(profiles);
  } catch (err) {
    console.error("Error in explore profiles:", err);
    res.status(500).send(err.message);
  }
});

// SEARCH: Dedicated User Profiles Search (Pure matching, NOT trending)
app.get(["/users/search", "/api/users/search"], auth, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    const followCollec = getFollowCollec();
    const currentUserId = new ObjectId(req.user.id);
    const q = req.query.q?.trim();

    if (!q) {
      return res.send([]);
    }

    // Escape regex special characters
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    // Pure text match - DO NOT rank by likes/comments/followers/popularity!
    const matches = await userCollec
      .find(
        {
          _id: { $ne: currentUserId },
          accountStatus: { $ne: "suspended" },
          $or: [
            { fullname: regex },
            { fullName: regex },
            { email: regex },
            { department: regex },
          ],
        },
        { projection: { password: 0 } }
      )
      .limit(25)
      .toArray();

    if (matches.length === 0) {
      return res.send([]);
    }

    const matchIds = matches.map((u) => u._id);

    // Fetch follow states for current user
    const myFollows = await followCollec
      .find({
        followerId: currentUserId,
        followingId: { $in: matchIds },
      })
      .toArray();

    const theirFollows = await followCollec
      .find({
        followerId: { $in: matchIds },
        followingId: currentUserId,
        status: "accepted",
      })
      .toArray();

    const myFollowMap = new Map();
    myFollows.forEach((f) => myFollowMap.set(f.followingId.toString(), f.status));

    const theirFollowSet = new Set();
    theirFollows.forEach((f) => theirFollowSet.add(f.followerId.toString()));

    const results = matches.map((u) => {
      const uId = u._id.toString();
      const myStatus = myFollowMap.get(uId);
      let relationshipStatus = "none";

      if (myStatus === "accepted") {
        relationshipStatus = "following";
      } else if (myStatus === "pending") {
        relationshipStatus = "requested";
      } else if (theirFollowSet.has(uId)) {
        relationshipStatus = "follow_back";
      }

      return {
        ...u,
        followerCount: u.followerCount ?? u.followers ?? 0,
        followingCount: u.followingCount ?? u.following ?? 0,
        relationshipStatus,
      };
    });

    res.send(results);
  } catch (err) {
    console.error("Error in user search:", err);
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
    const notifCollec = getNotifCollec();
    const userCollec = getUserCollec();
    const postId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.id);

    const post = await postCollec.findOne({ _id: postId });
    if (!post) return res.status(404).send("Post not found");

    const likes = post.likes || [];
    const alreadyLiked = likes.some((id) => id.toString() === req.user.id);

    if (alreadyLiked) {
      await postCollec.updateOne({ _id: postId }, { $pull: { likes: userId } });
      // Remove any existing unread like notification from this user for this post
      await notifCollec.deleteMany({
        recipientId: post.authorId,
        senderId: userId,
        type: "like",
        postId: postId,
      });
    } else {
      await postCollec.updateOne({ _id: postId }, { $addToSet: { likes: userId } });

      // Create notification only if actor !== postOwner
      const postAuthorIdStr = post.authorId?.toString();
      if (postAuthorIdStr && postAuthorIdStr !== req.user.id) {
        const actorUser = await userCollec.findOne({ _id: userId });
        await notifCollec.insertOne({
          recipientId: post.authorId,
          senderId: userId,
          senderName: actorUser?.fullname || "Campus User",
          senderPhoto: actorUser?.profilePhoto || "",
          type: "like",
          postId: postId,
          status: "unread",
          createdAt: new Date(),
        });
      }
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
    const notifCollec = getNotifCollec();
    const postId = new ObjectId(req.params.id);

    const text = req.body.text?.trim();
    if (!text) return res.status(400).send("Comment text is required");

    const post = await postCollec.findOne({ _id: postId });
    if (!post) return res.status(404).send("Post not found");

    const authorUser = await userCollec.findOne({ _id: new ObjectId(req.user.id) });

    const newComment = {
      _id: new ObjectId(),
      authorId: new ObjectId(req.user.id),
      authorName: authorUser?.fullname || "Campus User",
      text,
      createdAt: new Date(),
    };

    await postCollec.updateOne({ _id: postId }, { $push: { comments: newComment } });

    // Create notification only if actor !== postOwner
    const postAuthorIdStr = post.authorId?.toString();
    if (postAuthorIdStr && postAuthorIdStr !== req.user.id) {
      await notifCollec.insertOne({
        recipientId: post.authorId,
        senderId: new ObjectId(req.user.id),
        senderName: authorUser?.fullname || "Campus User",
        senderPhoto: authorUser?.profilePhoto || "",
        type: "comment",
        postId: postId,
        commentText: text.slice(0, 100),
        status: "unread",
        createdAt: new Date(),
      });
    }

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

// ==========================================
// FOLLOW & RELATIONSHIP ROUTES
// ==========================================

// Send follow request
app.post("/follow/:targetUserId", auth, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    const followCollec = getFollowCollec();
    const notifCollec = getNotifCollec();

    if (!ObjectId.isValid(req.params.targetUserId)) {
      return res.status(400).send("Invalid target user ID");
    }

    if (req.user.id === req.params.targetUserId) {
      return res.status(400).send("You cannot follow yourself");
    }

    const currentUserId = new ObjectId(req.user.id);
    const targetUserId = new ObjectId(req.params.targetUserId);

    const targetUser = await userCollec.findOne({ _id: targetUserId });
    if (!targetUser) return res.status(404).send("Target user not found");

    const existingFollow = await followCollec.findOne({
      followerId: currentUserId,
      followingId: targetUserId,
    });

    if (existingFollow) {
      if (existingFollow.status === "accepted") {
        return res.status(400).send("Already following this user");
      }
      if (existingFollow.status === "pending") {
        return res.status(400).send("Follow request already pending");
      }
    }

    const newFollow = {
      followerId: currentUserId,
      followingId: targetUserId,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await followCollec.insertOne(newFollow);

    const currentUser = await userCollec.findOne({ _id: currentUserId });

    const newNotif = {
      recipientId: targetUserId,
      senderId: currentUserId,
      senderName: currentUser?.fullname || "Campus User",
      senderPhoto: currentUser?.profilePhoto || "",
      type: "follow_request",
      status: "pending",
      createdAt: new Date(),
    };
    await notifCollec.insertOne(newNotif);

    res.send({ message: "Follow request sent", status: "requested" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Accept follow request
app.post("/follow/accept/:targetUserId", auth, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    const followCollec = getFollowCollec();
    const notifCollec = getNotifCollec();

    if (!ObjectId.isValid(req.params.targetUserId)) {
      return res.status(400).send("Invalid user ID");
    }

    const currentUserId = new ObjectId(req.user.id);
    const requesterId = new ObjectId(req.params.targetUserId);

    const pendingFollow = await followCollec.findOne({
      followerId: requesterId,
      followingId: currentUserId,
      status: "pending",
    });

    if (!pendingFollow) {
      return res.status(400).send("No pending follow request found from this user");
    }

    await followCollec.updateOne(
      { _id: pendingFollow._id },
      { $set: { status: "accepted", updatedAt: new Date() } }
    );

    // Synchronize counts in MongoDB for both users:
    // Requester (User A): Following count increments (+1)
    // Current User (User B): Followers count increments (+1)
    await syncUserFollowCounts(requesterId);
    await syncUserFollowCounts(currentUserId);

    // Update notification on recipient side
    await notifCollec.updateMany(
      { recipientId: currentUserId, senderId: requesterId, type: "follow_request" },
      { $set: { status: "accepted" } }
    );

    // Send acceptance notification to requester
    const currentUser = await userCollec.findOne({ _id: currentUserId });
    await notifCollec.insertOne({
      recipientId: requesterId,
      senderId: currentUserId,
      senderName: currentUser?.fullname || "Campus User",
      senderPhoto: currentUser?.profilePhoto || "",
      type: "follow_accept",
      status: "unread",
      createdAt: new Date(),
    });

    res.send({ message: "Follow request accepted", status: "accepted" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Follow back
app.post(["/follow/back/:targetUserId", "/follow-back/:targetUserId"], auth, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    const followCollec = getFollowCollec();
    const notifCollec = getNotifCollec();

    if (!ObjectId.isValid(req.params.targetUserId)) {
      return res.status(400).send("Invalid target user ID");
    }

    if (req.user.id === req.params.targetUserId) {
      return res.status(400).send("You cannot follow yourself");
    }

    const currentUserId = new ObjectId(req.user.id);
    const targetUserId = new ObjectId(req.params.targetUserId);

    const targetUser = await userCollec.findOne({ _id: targetUserId });
    if (!targetUser) return res.status(404).send("Target user not found");

    const existingFollow = await followCollec.findOne({
      followerId: currentUserId,
      followingId: targetUserId,
    });

    if (existingFollow && existingFollow.status === "accepted") {
      return res.send({ message: "Already following", status: "following" });
    }

    if (existingFollow) {
      await followCollec.updateOne(
        { _id: existingFollow._id },
        { $set: { status: "accepted", updatedAt: new Date() } }
      );
    } else {
      await followCollec.insertOne({
        followerId: currentUserId,
        followingId: targetUserId,
        status: "accepted",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Synchronize counts:
    // Current User (B) following count +1
    // Target User (A) followers count +1
    await syncUserFollowCounts(currentUserId);
    await syncUserFollowCounts(targetUserId);

    // Send notification to target user (User A)
    const currentUser = await userCollec.findOne({ _id: currentUserId });
    await notifCollec.insertOne({
      recipientId: targetUserId,
      senderId: currentUserId,
      senderName: currentUser?.fullname || "Campus User",
      senderPhoto: currentUser?.profilePhoto || "",
      type: "follow_back",
      status: "unread",
      createdAt: new Date(),
    });

    res.send({ message: "Followed back successfully", status: "following" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Reject follow request
app.post("/follow/reject/:targetUserId", auth, async (req, res) => {
  try {
    const followCollec = getFollowCollec();
    const notifCollec = getNotifCollec();

    if (!ObjectId.isValid(req.params.targetUserId)) {
      return res.status(400).send("Invalid user ID");
    }

    const currentUserId = new ObjectId(req.user.id);
    const requesterId = new ObjectId(req.params.targetUserId);

    const pendingFollow = await followCollec.findOne({
      followerId: requesterId,
      followingId: currentUserId,
      status: "pending",
    });

    if (!pendingFollow) {
      return res.status(400).send("No pending follow request found from this user");
    }

    await followCollec.deleteOne({ _id: pendingFollow._id });

    await notifCollec.updateMany(
      { recipientId: currentUserId, senderId: requesterId, type: "follow_request" },
      { $set: { status: "rejected" } }
    );

    res.send({ message: "Follow request rejected", status: "none" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Unfollow user (or cancel pending request)
app.delete(["/unfollow/:targetUserId", "/follow/:targetUserId"], auth, async (req, res) => {
  try {
    const followCollec = getFollowCollec();
    const notifCollec = getNotifCollec();

    if (!ObjectId.isValid(req.params.targetUserId)) {
      return res.status(400).send("Invalid target user ID");
    }

    const currentUserId = new ObjectId(req.user.id);
    const targetUserId = new ObjectId(req.params.targetUserId);

    await followCollec.deleteOne({
      followerId: { $in: [currentUserId, req.user.id] },
      followingId: { $in: [targetUserId, req.params.targetUserId] },
    });

    // Remove any pending follow request notifications
    await notifCollec.deleteMany({
      recipientId: { $in: [targetUserId, req.params.targetUserId] },
      senderId: { $in: [currentUserId, req.user.id] },
      type: "follow_request",
      status: "pending",
    });

    // Synchronize counts in MongoDB for both users:
    // Current User (User A): Following count decrements (-1)
    // Target User (User B): Followers count decrements (-1)
    await syncUserFollowCounts(currentUserId);
    await syncUserFollowCounts(targetUserId);

    // NEVER send an unfollow notification!
    res.send({ message: "Unfollowed successfully", status: "none" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// List of followers (accepted only)
app.get("/users/:userId/followers", auth, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    const followCollec = getFollowCollec();

    if (!ObjectId.isValid(req.params.userId)) {
      return res.status(400).send("Invalid user ID");
    }

    const targetId = new ObjectId(req.params.userId);
    const follows = await followCollec.find({ followingId: targetId, status: "accepted" }).toArray();
    const followerIds = follows.map((f) => f.followerId);

    const followers = await userCollec
      .find({ _id: { $in: followerIds } }, { projection: { password: 0 } })
      .toArray();

    res.send(followers);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// List of following (accepted only)
app.get("/users/:userId/following", auth, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    const followCollec = getFollowCollec();

    if (!ObjectId.isValid(req.params.userId)) {
      return res.status(400).send("Invalid user ID");
    }

    const targetId = new ObjectId(req.params.userId);
    const follows = await followCollec.find({ followerId: targetId, status: "accepted" }).toArray();
    const followingIds = follows.map((f) => f.followingId);

    const following = await userCollec
      .find({ _id: { $in: followingIds } }, { projection: { password: 0 } })
      .toArray();

    res.send(following);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// User's unarchived posts
app.get("/users/:userId/posts", auth, async (req, res) => {
  try {
    const postCollec = getPostCollec();

    if (!ObjectId.isValid(req.params.userId)) {
      return res.status(400).send("Invalid user ID");
    }

    const targetId = new ObjectId(req.params.userId);
    const posts = await postCollec
      .find({ authorId: targetId, archived: { $ne: true } })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(posts);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ==========================================
// NOTIFICATIONS ROUTES
// ==========================================

app.get("/notifications", auth, async (req, res) => {
  try {
    const notifCollec = getNotifCollec();
    const currentUserId = new ObjectId(req.user.id);

    const notifications = await notifCollec
      .find({ recipientId: currentUserId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    res.send(notifications);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.patch("/notifications/:id/read", auth, async (req, res) => {
  try {
    const notifCollec = getNotifCollec();
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).send("Invalid notification ID");
    }

    const notifId = new ObjectId(req.params.id);
    const currentUserId = new ObjectId(req.user.id);

    await notifCollec.updateOne(
      { _id: notifId, recipientId: currentUserId },
      { $set: { status: "read" } }
    );

    res.send("Notification marked as read");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.patch("/notifications/read-all", auth, async (req, res) => {
  try {
    const notifCollec = getNotifCollec();
    const currentUserId = new ObjectId(req.user.id);

    await notifCollec.updateMany(
      { recipientId: currentUserId, status: "unread" },
      { $set: { status: "read" } }
    );

    res.send("All notifications marked as read");
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