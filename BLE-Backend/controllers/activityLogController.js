const ActivityLog = require("../models/ActivityLog");

exports.getActivityLogs = async (req, res) => {
  try {
    let { page = 1, limit = 10, user, action, search } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // Initial filter for Mongo query
    const filter = {};
    if (user) filter.user = user;
    if (action) filter.action = action;

    // Fetch all logs matching filter and populate user
    let logs = await ActivityLog.find(filter)
      .populate("user", "username role")
      .sort({ timestamp: -1 });

    // Apply search on username, action, or description if search exists
    if (search) {
      const s = search.toLowerCase();
      logs = logs.filter(
        (log) =>
          log.user?.username?.toLowerCase().includes(s) ||
          log.action?.toLowerCase().includes(s) ||
          log.description?.toLowerCase().includes(s)
      );
    }

    const total = logs.length;

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedLogs = logs.slice(startIndex, startIndex + limit);

    res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      logs: paginatedLogs,
    });
  } catch (err) {
    console.error("Failed to fetch activity logs:", err);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
};
