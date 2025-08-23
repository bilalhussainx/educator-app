// -----------------------------------------------------------------
// FILE: controllers/authController.js (UPDATED)
// -----------------------------------------------------------------
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // The 'role' column will automatically default to 'student' as defined in our database schema.
    const newUser = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, email, hashedPassword]
    );
    res.status(201).json({
      message: 'User registered successfully!',
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // We now select the 'role' column as well.
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    // UPDATED: The JWT payload now includes the user's ID, username, and role.
    // This gives the frontend all the information it needs about the logged-in user.
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// /*
//  * =================================================================
//  * FILE: controllers/authController.js
//  * =================================================================
//  * DESCRIPTION: This is the core logic for our authentication. It handles
//  * the business logic of registering a user, checking credentials, and
//  * creating tokens.
//  */
// const db = require('../db');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');

// exports.register = async (req, res) => {
//   try {
//     const { username, password, email } = req.body;

//     // 1. Check if user already exists
//     const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
//     if (userExists.rows.length > 0) {
//       return res.status(400).json({ error: 'An account with this email already exists.' });
//     }

//     // 2. Hash the password
//     // Hashing is a one-way process. You can't un-hash a password.
//     // We store the hash, not the plain text password.
//     // A "salt" is random data added to the password before hashing,
//     // which ensures that even identical passwords result in different hashes.
//     // `bcrypt.genSalt` and `bcrypt.hash` handle this for us.
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // 3. Save the new user to the database
//     const newUser = await db.query(
//       'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
//       [username, email, hashedPassword]
//     );

//     res.status(201).json({
//       message: 'User registered successfully!',
//       user: newUser.rows[0],
//     });

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server error');
//   }
// };

// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // 1. Find the user by email
//     const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
//     if (userResult.rows.length === 0) {
//       return res.status(401).json({ error: 'Invalid credentials.' }); // Use a generic error
//     }
//     const user = userResult.rows[0];

//     // 2. Compare the provided password with the stored hash
//     // `bcrypt.compare` re-hashes the plain text password from the login attempt
//     // and securely compares it to the hash stored in our database.
//     const isMatch = await bcrypt.compare(password, user.password_hash);
//     if (!isMatch) {
//       return res.status(401).json({ error: 'Invalid credentials.' });
//     }

//     // 3. If passwords match, create a JWT
//     // A JSON Web Token (JWT) is a compact, URL-safe means of representing
//     // claims to be transferred between two parties.
//     // We are creating a token that "claims" the user has an ID of `user.id`.
//     const payload = {
//       user: {
//         id: user.id,
//       },
//     };

//     // We "sign" the token with our secret key. The server is the only one
//     // who knows the secret. This prevents clients from creating fake tokens.
//     jwt.sign(
//       payload,
//       process.env.JWT_SECRET,
//       { expiresIn: '5h' }, // Token will be valid for 5 hours
//       (err, token) => {
//         if (err) throw err;
//         res.json({ token });
//       }
//     );

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server error');
//   }
// };