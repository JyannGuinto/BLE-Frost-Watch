const User = require("../models/User");
const jwt = require("jsonwebtoken");
const logActivity = require("../utils/logger");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

exports.register = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = new User({ username, password, role });
    await user.save();
    res.json({ message: "User registered successfully." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  // User not found
  if (!user) {
    await logActivity(
      req,
      "LOGIN_FAILED",
      `Failed login attempt for username '${username}'`,
      { reason: "User not found" }
    );
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const validPassword = await user.comparePassword(password);

  if (!validPassword) {
    await logActivity(
      req,
      "LOGIN_FAILED",
      `Failed login attempt for username '${username}'`,
      { reason: "Incorrect password" }
    );
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = generateToken(user);

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  });

  await logActivity(
    req,
    "LOGIN_SUCCESS",
    `User ${username} logged in`,
    { userId: user._id }
  );

  res.json({
    message: "Logged in",
    user: {
      username: user.username,
      role: user.role,
    },
  });
};

exports.logout = async (req, res) => {
  // Log the logout only if user is authenticated
  if (req.user) {
    await logActivity(
      req,
      "LOGOUT",
      `User ${req.user.username} logged out`,
      { userId: req.user._id }
    );
  }

  res.clearCookie("token");
  res.json({ message: "Logged out" });
};


exports.me = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json({
    user: {
      _id: req.user._id,
      username: req.user.username,
      role: req.user.role,
    },
  });
};
