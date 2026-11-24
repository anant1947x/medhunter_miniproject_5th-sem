const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { searchMedicine, suggestMedicines } = require("../controllers/searchController");

router.get("/", protect, authorize("user", "admin"), searchMedicine);
router.get("/suggestions", protect, authorize("user", "admin"), suggestMedicines);

module.exports = router;
