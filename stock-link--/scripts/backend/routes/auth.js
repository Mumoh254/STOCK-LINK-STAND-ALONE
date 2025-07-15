const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'InventorySecrests'; 

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(403).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; 
  if (!token) {
    return res.status(403).json({ error: 'Token format is incorrect' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      console.error("JWT Verification Error:", err.message);
      return res.status(401).json({ error: 'Failed to authenticate token' });
    }
    req.userId = decoded.id; 
    req.userEmail = decoded.email;
    next();
  });
};

// Register a new user
router.post('/register', async (req, res) => {

  const { username, email, password } = req.body; 
  
  // Basic validation
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields (Username, Email, Password)' }); 
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
    db.run(sql, [username, email, hashedPassword], function (err) {
      if (err) {
        console.error("Database error during registration:", err.message);
        // Check for unique constraint 
        if (err.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({ error: 'User with this email already exists.' });
        }
        return res.status(500).json({ error: 'Failed to register user due to database error.' });
      }
      // Issue a token upon successful registration
      const token = jwt.sign({ id: this.lastID, email: email }, SECRET_KEY, { expiresIn: '1d' });
      res.status(201).json({ success: true, userId: this.lastID, token });
    });
  } catch (e) {
    console.error("Error during password hashing:", e.message);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login a user
router.post('/login', (req, res) => {
  const { Email, Password } = req.body; 
  if (!Email || !Password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [Email], async (err, user) => {
    if (err) {
        console.error("Database error during login:", err.message);
        return res.status(500).json({ error: 'Server error during login.' });
    }
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(Password, user.password);
    if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1d' });
    res.json({ success: true, token });
  });
});

// Reset Password 
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Missing email or new password' });
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    db.run(`UPDATE users SET password = ? WHERE email = ?`, [hashed, email], function (err) {
      if (err) {
        console.error("Database error during password reset:", err.message);
        return res.status(500).json({ error: 'Failed to reset password due to database error.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found or password already the same.' });
      }

      res.json({ success: true, message: 'Password updated successfully' });
    });
  } catch (e) {
    console.error("Error during password hashing for reset:", e.message);
    res.status(500).json({ error: 'Server error during password reset.' });
  }
});


router.get('/protected-route', verifyToken, (req, res) => {
  res.json({ message: `Welcome, user ${req.userEmail}! You accessed a protected route.`, userId: req.userId });
});

module.exports = router
