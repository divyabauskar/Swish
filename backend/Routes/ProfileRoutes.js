const express = require("express");
const ProfileController=require("../Controllers/ProfileController"); 
let router = express.Router();

router.get("/profile", ProfileController.getProfile);
router.put("/profile/:id", ProfileController.updateProfile);

module.exports = router;