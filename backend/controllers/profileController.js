 const { ObjectId } = require("mongodb");
const { getUserCollec } = require("../config/db");

// GET Logged-in User Profile
const getProfile = async (req, res) => {
  try {
    const userCollec = getUserCollec();

    const user = await userCollec.findOne({
      _id: new ObjectId(req.user.id),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    delete user.password;

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// UPDATE Profile
const updateProfile = async (req, res) => {
  try {
    const userCollec = getUserCollec();

    const updateData = {
      bio: req.body.bio,
      college: req.body.college,
      course: req.body.course,
    };

    if (req.file) {
      updateData.profilePicture = req.file.path;
    }

    await userCollec.updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: updateData }
    );

    const updatedUser = await userCollec.findOne({
      _id: new ObjectId(req.user.id),
    });

    delete updatedUser.password;

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};