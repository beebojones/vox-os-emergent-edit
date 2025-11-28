import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../utils/db.js";

async function ensureAuditTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      actor_id INTEGER,
      target_id INTEGER,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
}

// ----------------------------------------------------
// UPDATE PREFERENCES (JSONB)
// ----------------------------------------------------
export async function updatePreferences(req, res) {
  try {
    const userId = req.user.id;
    const { preferences } = req.body || {};
    if (!preferences || typeof preferences !== 'object') return res.status(400).json({ error: 'preferences object required' });
    await db.query('UPDATE users SET preferences = $1 WHERE id = $2', [preferences, userId]);
    res.json({ success: true });
  } catch (e) {
    console.error('updatePreferences error:', e);
    res.status(500).json({ error: 'Unable to save preferences' });
  }
}

// ----------------------------------------------------
// UPDATE PROFILE PHOTO (accepts dataUrl string)
// ----------------------------------------------------
export async function updateProfilePhoto(req, res) {
  try {
    const userId = req.user.id;
    const { dataUrl } = req.body || {};

    if (typeof dataUrl !== 'string') return res.status(400).json({ error: 'Invalid dataUrl' });

    // Allow clearing the photo when empty string passed
    if (!dataUrl || dataUrl.trim() === '') {
      await db.query('UPDATE users SET profile_photo = NULL WHERE id = $1', [userId]);
      return res.json({ success: true, cleared: true });
    }

    if (dataUrl.length < 20) return res.status(400).json({ error: 'Invalid dataUrl' });
    // size guard (~10MB)
    if (dataUrl.length > 10_000_000) return res.status(413).json({ error: 'Image too large' });

    await db.query('UPDATE users SET profile_photo = $1 WHERE id = $2', [dataUrl, userId]);
    res.json({ success: true });
  } catch (e) {
    console.error('updateProfilePhoto error:', e);
    res.status(500).json({ error: 'Unable to save profile photo' });
  }
}

async function logAudit(action, actorId, targetId, details) {
  try {
    await ensureAuditTable();
    await db.query(
      `INSERT INTO audit_log (action, actor_id, target_id, details)
       VALUES ($1, $2, $3, $4)`,
      [action, actorId ?? null, targetId ?? null, details ?? null]
    );
  } catch (e) {
    console.warn("audit log failed:", e?.message || e);
  }
}


// ------------------------------------------
// Helper: Create JWT + send as cookie
// ------------------------------------------
function sendToken(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set to true in production (https)
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}



// ------------------------------------------
// REGISTER
// ------------------------------------------
export async function registerUser(req, res) {
  try {
    const { username, displayName, password } = req.body;

    if (!username || !displayName || !password) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Ensure unique username
    const existing = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Username already taken." });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user (no PIN)
    await db.query(
      `INSERT INTO users (username, display_name, password_hash, role)
       VALUES ($1, $2, $3, 'user')`,
      [username, displayName, passwordHash]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed." });
  }
}



// ------------------------------------------
// LOGIN (step 1)
// ------------------------------------------
export async function loginUser(req, res) {
  try {
    const { username, password } = req.body;

const result = await db.query(
      "SELECT id, password_hash FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const user = result.rows[0];

    // Check password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    // PIN gating disabled: always issue session on password success
    sendToken(res, { id: user.id });
    // Clear any leftover temp cookie from prior flows
    res.clearCookie('temp_user');
    res.json({ success: true });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed." });
  }
}



// ------------------------------------------
// PIN UNLOCK (step 2)
// ------------------------------------------
export async function verifyPin(req, res) {
  try {
    const { pin } = req.body;
    const tempId = req.cookies.temp_user;

    if (!tempId) return res.status(401).json({ error: "No session pending." });

    const result = await db.query(
      "SELECT pin_hash FROM users WHERE id = $1",
      [tempId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "User not found." });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(pin, user.pin_hash);
    if (!match) {
      return res.status(400).json({ error: "Incorrect PIN." });
    }

    // PIN correct — issue JWT
    sendToken(res, { id: tempId });

    // Clear temp cookie
    res.clearCookie("temp_user");

    res.json({ success: true });

  } catch (err) {
    console.error("PIN error:", err);
    res.status(500).json({ error: "PIN verification failed." });
  }
}



// ------------------------------------------
// CREATE or CHANGE PIN
// ------------------------------------------
export async function setPin(req, res) {
  try {
    const userId = req.user.id;
    const { currentPin, newPin } = req.body;

    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ error: "PIN must be 4 digits." });
    }

    // Get current pin hash
    const result = await db.query(
      "SELECT pin_hash FROM users WHERE id = $1",
      [userId]
    );

    const user = result.rows[0];

    // If a PIN exists, verify current PIN first
    if (user.pin_hash) {
      if (!currentPin) {
        return res.status(400).json({ error: "Current PIN required." });
      }

      const match = await bcrypt.compare(currentPin, user.pin_hash);
      if (!match) {
        return res.status(400).json({ error: "Incorrect current PIN." });
      }
    }

    const newHash = await bcrypt.hash(newPin, 10);

    await db.query(
      "UPDATE users SET pin_hash = $1 WHERE id = $2",
      [newHash, userId]
    );

    res.json({ success: true, message: "PIN saved." });

  } catch (err) {
    console.error("Set PIN error:", err);
    res.status(500).json({ error: "Unable to update PIN." });
  }
}



// ------------------------------------------
// REMOVE PIN
// ------------------------------------------
export async function removePin(req, res) {
  try {
    const userId = req.user.id;

    await db.query(
      "UPDATE users SET pin_hash = NULL WHERE id = $1",
      [userId]
    );

    res.json({ success: true, message: "PIN removed." });

  } catch (err) {
    console.error("Remove PIN error:", err);
    res.status(500).json({ error: "Unable to remove PIN." });
  }
}

// ----------------------------------------------------
// UPDATE DISPLAY NAME
// ----------------------------------------------------
export async function updateDisplayName(req, res) {
  try {
    const userId = req.user.id;
    const { displayName } = req.body;

    if (!displayName || displayName.trim().length < 2) {
      return res.status(400).json({ error: "Display name is too short." });
    }

    await db.query(
      "UPDATE users SET display_name = $1 WHERE id = $2",
      [displayName.trim(), userId]
    );

    res.json({ success: true, message: "Display name updated." });
  } catch (err) {
    console.error("Update display name error:", err);
    res.status(500).json({ error: "Unable to update display name." });
  }
}



// ----------------------------------------------------
// UPDATE USERNAME  (REQUIRES PASSWORD)
// ----------------------------------------------------
export async function updateUsername(req, res) {
  try {
    const userId = req.user.id;
    const { username, password } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: "Username is too short." });
    }

    if (!password) {
      return res.status(400).json({ error: "Password required." });
    }

    // Fetch user
    const result = await db.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );

    const user = result.rows[0];

    // Verify password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: "Incorrect password." });
    }

    // Ensure unique username
    const exists = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Username already taken." });
    }

    await db.query(
      "UPDATE users SET username = $1 WHERE id = $2",
      [username.trim(), userId]
    );

    res.json({ success: true, message: "Username updated." });
  } catch (err) {
    console.error("Update username error:", err);
    res.status(500).json({ error: "Unable to update username." });
  }
}



// ----------------------------------------------------
// UPDATE PASSWORD
// ----------------------------------------------------
// ------------------------------------------
// ADMIN LOGIN (bypass password using env token)
// ------------------------------------------
export async function adminLogin(req, res) {
  try {
    const { token } = req.body || {};
    const expected = process.env.ADMIN_BYPASS_TOKEN;
    if (!expected || token !== expected) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // Map bypass to the real admin DB row (create if missing)
    let userRow = null;
    const r = await db.query('SELECT id, username FROM users WHERE username = $1 LIMIT 1', ['admin']);
    if (r.rowCount) userRow = r.rows[0];
    else {
      const ins = await db.query("INSERT INTO users (username, display_name, role) VALUES ('admin','Admin','admin') RETURNING id, username");
      userRow = ins.rows[0];
    }
    sendToken(res, { id: userRow.id });
    res.json({ success: true, user: { id: userRow.id, username: userRow.username, role: 'admin' } });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Admin login failed." });
  }
}

export function adminEnabled(req, res) {
  res.json({ enabled: !!process.env.ADMIN_BYPASS_TOKEN });
}

// ------------------------------------------
// MAKE ADMIN (admin-only)
// ------------------------------------------
export async function makeAdmin(req, res) {
  try {
    const actorId = req.user.id;
    const { username, userId } = req.body || {};

    let target;
    if (userId) {
      const r = await db.query('SELECT id, username FROM users WHERE id = $1', [userId]);
      if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
      target = r.rows[0];
    } else if (username) {
      const r = await db.query('SELECT id, username FROM users WHERE username = $1', [username]);
      if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
      target = r.rows[0];
    } else {
      // default: promote self
      const r = await db.query('SELECT id, username FROM users WHERE id = $1', [actorId]);
      if (!r.rowCount) return res.status(404).json({ error: 'Your user not found' });
      target = r.rows[0];
    }

    await db.query('UPDATE users SET role = \"admin\" WHERE id = $1', [target.id]);
    await logAudit('make_admin', actorId, target.id, { via: 'api' });

    res.json({ success: true, target });
  } catch (e) {
    console.error('makeAdmin error:', e);
    res.status(500).json({ error: 'Failed to promote user' });
  }
}

// ------------------------------------------
// LIST USERS (admin-only)
// ------------------------------------------
export async function listUsers(req, res) {
  try {
    const { rows } = await db.query('SELECT id, username, display_name, role FROM users ORDER BY id ASC');
    res.json(rows);
  } catch (e) {
    console.error('listUsers error:', e);
    res.status(500).json({ error: 'Failed to list users' });
  }
}

// ------------------------------------------
// SET ROLE (admin-only)
// ------------------------------------------
export async function setRole(req, res) {
  try {
    const actorId = req.user.id;
    const { userId, username, role } = req.body || {};
    if (!role || !['admin','user'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    let target;
    if (userId) {
      const r = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
      target = r.rows[0];
    } else if (username) {
      const r = await db.query('SELECT id FROM users WHERE username = $1', [username]);
      if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
      target = r.rows[0];
    } else {
      return res.status(400).json({ error: 'userId or username required' });
    }

    await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, target.id]);
    await logAudit('set_role', actorId, target.id, { role });

    res.json({ success: true });
  } catch (e) {
    console.error('setRole error:', e);
    res.status(500).json({ error: 'Failed to set role' });
  }
}

export async function updatePassword(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }

    // Fetch user
    const result = await db.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );

    const user = result.rows[0];

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    // Hash the new password
    const newHash = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [newHash, userId]
    );

    res.json({ success: true, message: "Password updated." });
  } catch (err) {
    console.error("Update password error:", err);
    res.status(500).json({ error: "Unable to update password." });
  }
}

