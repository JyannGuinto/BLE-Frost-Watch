const express = require("express");
const router = express.Router();
const assetController = require("../controllers/assetController");


router.get("/dropdown", assetController.getAssetsForDropdown);
router.post("/", assetController.createAsset);
router.get("/", assetController.getAssets);
router.get("/:id", assetController.getAssetById);
router.put("/:id", assetController.updateAsset);
router.delete("/:id", assetController.deleteAsset);

module.exports = router;