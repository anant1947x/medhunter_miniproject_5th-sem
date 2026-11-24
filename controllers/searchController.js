const mongoose = require("mongoose");
const Medicine = require("../models/Medicine");
const Shop = require("../models/Shop");

const medicineNamePattern = (name) =>
  name.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.suggestMedicines = async (req, res) => {
  try {
    const { name } = req.query;

    if (typeof name !== "string" || name.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const catalog = mongoose.connection.useDb(
      process.env.MEDICINE_CATALOG_DB || "test",
      { useCache: true }
    );
    const medicines = await catalog.collection("medicines").aggregate([
      {
        $match: {
          name: { $regex: medicineNamePattern(name), $options: "i" },
        },
      },
      {
        $group: {
          _id: { $toLower: "$name" },
          name: { $min: "$name" },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 8 },
    ]).toArray();

    res.json({ suggestions: medicines.map((medicine) => medicine.name) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchMedicine = async (req, res) => {
  try {
    const { name, lat, lng, maxDistance } = req.query;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Medicine name is required" });
    }
    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "User latitude and longitude are required" });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxDist = parseInt(maxDistance) || 10000;

    const matchingMedicines = await Medicine.find({
      nameNormalized: { $regex: medicineNamePattern(name), $options: "i" },
      stock: { $gt: 0 },
    }).lean();

    if (matchingMedicines.length === 0) {
      return res.json({ count: 0, results: [] });
    }

    const shopIds = [...new Set(matchingMedicines.map((m) => m.shop.toString()))];

    const approvedShops = await Shop.find({
      _id: { $in: shopIds },
      status: "approved",
    }).select("_id");

    const approvedShopIds = approvedShops.map((s) => s._id.toString());
    const filteredMedicines = matchingMedicines.filter((m) =>
      approvedShopIds.includes(m.shop.toString())
    );

    const nearbyShops = await Shop.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [userLng, userLat],
          },
          distanceField: "distance",
          maxDistance: maxDist,
          query: {
            _id: { $in: approvedShopIds.map((id) => new mongoose.Types.ObjectId(id)) },
          },
          spherical: true,
        },
      },
      {
        $project: {
          shopName: 1,
          ownerName: 1,
          contactNumber: 1,
          shopAddress: 1,
          location: 1,
          distance: 1,
        },
      },
    ]);

    const results = nearbyShops.map((shop) => {
      const shopMedicines = filteredMedicines
        .filter((m) => m.shop.toString() === shop._id.toString())
        .map((m) => ({
          _id: m._id,
          name: m.name,
          manufacturer: m.manufacturer,
          price: m.price,
          stock: m.stock,
          expiryDate: m.expiryDate,
        }));

      return {
        shop: {
          _id: shop._id,
          shopName: shop.shopName,
          ownerName: shop.ownerName,
          contactNumber: shop.contactNumber,
          shopAddress: shop.shopAddress,
          coordinates: shop.location.coordinates,
          distanceInMeters: Math.round(shop.distance),
          distanceInKm: (shop.distance / 1000).toFixed(2),
        },
        medicines: shopMedicines,
      };
    });

    res.json({ count: results.length, results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
