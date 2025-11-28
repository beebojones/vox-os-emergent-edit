import jwt from "jsonwebtoken";
import db from "./../utils/db.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Always hydrate from DB by id; if not found, reject the session.
    const { rows } = await db.query('SELECT id, username, display_name, role, timestamp, profile_photo, preferences FROM users WHERE id = $1', [decoded.id]);
    if (!rows.length) return res.status(401).json({ error: 'User not found' });

    const u = rows[0];
    req.user = { id: u.id, username: u.username, display_name: u.display_name, role: u.role, timestamp: u.timestamp, profile_photo: u.profile_photo, preferences: u.preferences };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin only' });
}
