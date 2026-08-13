require("dotenv").config();

let express = require("express");
let cors = require("cors");
let cookieParser = require("cookie-parser");
let bcrypt = require("bcryptjs");
let jwt = require("jsonwebtoken");
let { ObjectId } = require("mongodb");
let { connectDB, getUserCollec } = require("./config/db");

let app = express();
let SECRET = process.env.JWT_SECRET;

app.use(express.json());
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

    if (obj.role == "Faculty" && obj.accountStatus == "pending") {
      return res.status(403).send("Your account is pending admin approval");
    }

    if (obj.accountStatus == "suspended") {
      return res.status(403).send("Your account has been suspended");
    }

    let token = jwt.sign({ id: obj._id, role: obj.role }, SECRET, { expiresIn: "1hr" });
    res.cookie("token", token, { httpOnly: true, maxAge: 60 * 60 * 1000 });

    res.send({ message: "Login Successful", role: obj.role });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/profile", auth, async (req, res) => {
  try {
    const userCollec = getUserCollec();
    let _id = new ObjectId(req.user.id);
    let obj = await userCollec.findOne({ _id });
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

    let students = await userCollec.find(filter).toArray();
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

    let faculty = await userCollec.find(filter).toArray();
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

connectDB()
  .then(() => {
    app.listen(3000, () => console.log("Server running on 3000"));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });