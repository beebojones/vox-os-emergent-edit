import jwt from "jsonwebtoken";
import db from "./../utils/db.js";

export async function requireAuth(req, res, next) {
  try {
    // Diagnostic logging (avoid secrets)
    // console.log("Auth check");

    const token = req.cookies.token;

    if (!token) {
      console.log("No token found in req.cookies");
      return res.status(401).json({ error: "Not authorized" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyErr) {
      console.log("JWT verify failed:", verifyErr);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Lookup user in DB
    const { rows } = await db.query(
      'SELECT id, username, display_name, role, timestamp, profile_photo, preferences FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!rows.length) {
      console.log("User not found for id:", decoded.id);
      return res.status(401).json({ error: "User not found" });
    }

    const u = rows[0];
    req.user = {
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      role: u.role,
      timestamp: u.timestamp,
      profile_photo: u.profile_photo,
      preferences: u.preferences
    };

    console.log("Authentication passed for user id:", u.id);

    next();
  } catch (err) {
    console.log("requireAuth unexpected error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ error: "Admin only" });
}
