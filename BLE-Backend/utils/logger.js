const ActivityLog = require("../models/ActivityLog");

async function logActivity(req, action, description, metadata = {}) {
  try {
    const userId = req.user ? req.user._id : null;

    const ip =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress;

    await ActivityLog.create({
      user: userId,
      action,
      description,
      ipAddress: ip,
      metadata
    });

  } catch (err) {
    console.error("Activity log failed:", err);
  }
}

module.exports = logActivity;
