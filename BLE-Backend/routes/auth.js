const router = require("express").Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { login, logout, me } = require("../controllers/authController");

router.post("/login", login);
router.post("/logout", auth, logout);
router.get("/me", auth, me);

module.exports = router;