/* Before activity log implementation
const router = require("express").Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const User = require("../models/User");

// Get all users
router.get("/", auth, admin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

// Create user (Admin creates accounts)
router.post("/", auth, admin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = new User({ username, password, role });
    await user.save();
    res.json({ message: "User created successfully." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update user (role, username, or password)
router.put("/:id", auth, admin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (username) user.username = username;
    if (role) user.role = role;

    // Only set the password field, let pre-save hook hash it
    if (password && password.trim() !== "") {
      user.password = password.trim();
    }

    await user.save(); // pre-save hook will hash the password
    res.json({ message: "User updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to update user." });
  }
});

// Delete user
router.delete("/:id", auth, admin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted." });
});

module.exports = router;
*/
const router = require("express").Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const User = require("../models/User");
const logActivity = require("../utils/logger");

// Get all users
router.get("/", auth, admin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

// Create user
router.post("/", auth, admin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = new User({ username, password, role });
    await user.save();

    await logActivity(
      req,
      "USER_CREATE",
      `Created user ${username}`,
      { newUserId: user._id, role }
    );

    res.json({ message: "User created successfully." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update user
router.put("/:id", auth, admin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ error: "User not found" });

    const oldData = {
      username: user.username,
      role: user.role
    };

    if (username) user.username = username;
    if (role) user.role = role;
    if (password && password.trim() !== "") {
      user.password = password.trim();
    }

    await user.save();

    await logActivity(
      req,
      "USER_UPDATE",
      `Updated user ${oldData.username}`,
      {
        userId: user._id,
        before: oldData,
        after: { username, role }
      }
    );

    res.json({ message: "User updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to update user." });
  }
});

// Delete user
router.delete("/:id", auth, admin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  await User.findByIdAndDelete(req.params.id);

  await logActivity(
    req,
    "USER_DELETE",
    `Deleted user ${user.username}`,
    { deletedUserId: user._id }
  );

  res.json({ message: "User deleted." });
});

module.exports = router;

