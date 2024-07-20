const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const app = express();
const port = 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(express.static('public'));

// Session setup
app.use(session({
    secret: 'secret-key',  // Replace with your own secret key
    resave: false,
    saveUninitialized: true
}));

// Set up nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',  // Use Gmail as your SMTP service
    auth: {
        user: 'duckifriend@gmail.com',  // Replace with your Gmail address
        pass: 'q3SUgwbHvJUX5n'    // Replace with your Gmail password
    }
});

// Initialize SQLite database (in-memory)
let db = new sqlite3.Database(':memory:');

// Create users table
db.serialize(() => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, email TEXT, password TEXT, verified INTEGER, token TEXT)");
});

// Generate a random token
function generateToken() {
    return crypto.randomBytes(20).toString('hex');
}


// Send verification email
function sendVerificationEmail(email, token) {
    const mailOptions = {
        from: 'verification@duck1e.xyz',  // Replace with your Gmail address
        to: email,
        subject: 'Email Verification',
        text: `Please verify your email by clicking on the following link: https://login.duck1e.xyz/verify-email?token=${token}`,
        html: `Please verify your email by clicking on the following link: <a href="https://login.duck1e.xyz/verify-email?token=${token}">Verify Email</a>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Verification email sent:', info.response);
        }
    });
}


// Serve the index.html file for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Registration endpoint
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);  // Hash the password
    const token = generateToken();  // Generate a verification token

    // Insert the new user into the database
    db.run("INSERT INTO users (username, email, password, verified, token) VALUES (?, ?, ?, ?, ?)", [username, email, hash, 0, token], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error registering new user' });
        }
        sendVerificationEmail(email, token);  // Send verification email
        res.status(200).json({ success: true });
    });
});

// Email verification endpoint
app.get('/verify-email', (req, res) => {
    const token = req.query.token;

    db.run("UPDATE users SET verified = 1 WHERE token = ?", [token], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error verifying email' });
        }
        res.send('Email verified successfully. You can now log in.');
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Query the database for the user
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error logging in' });
        }
        // Check if user exists and password matches
        if (row && bcrypt.compareSync(password, row.password)) {
            if (row.verified === 0) {
                return res.status(401).json({ success: false, message: 'Email not verified' });
            }
            req.session.user = username;  // Set the session user
            res.status(200).json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
