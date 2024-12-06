const mongoose = require("mongoose");
const User = require("../models/User"); 

const validateUserCondominium = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id; 
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User not authenticated" });
    }

    const user = await User.findById(userId).populate("condominium");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.condominium) {
      return res.status(403).json({ error: "Access denied: User not associated with a condominium" });
    }

    req.condominium = user.condominium;

    next();
  } catch (err) {
    console.error("Error validating user condominium:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = validateUserCondominium;
