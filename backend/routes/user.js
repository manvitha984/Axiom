// backend/routes/user.js
const express = require("express");
const { admin } = require("../firebase-config");
const router = express.Router();

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
    console.log("Received Headers:", req.headers);
    const token = req.headers.authorization?.split(" ")[1]; // Extract token
    if (!token) {
        console.log("No token provided");
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    try {
        console.log("Received Token:", token);
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log("Decoded Token:", decodedToken);
        req.user = decodedToken; // Attach decoded token to request object
        next(); // Pass control to the next middleware/route handler
    } catch (err) {
        console.error("Token verification failed:", err.message);
        res.status(401).json({ error: "Invalid Token" });
    }
};

// backend/routes/user.js
router.get("/me", verifyToken, async (req, res) => {
    try {
      console.log("User Data Request:", req.user); // Debugging log
      res.json({ user: req.user }); // Send decoded user data back
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

module.exports = router;