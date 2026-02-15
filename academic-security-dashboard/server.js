const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client')));

// Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'email@gmail.com', // Replace with real email
        pass: 'password'     // Replace with real app password
    }
});

// OTP Store (In-memory for demo)
const otpStore = new Map();

// Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Default XAMPP/MySQL user
    password: '1234', // Default XAMPP/MySQL password (empty)
    database: 'academic_security'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database.');
    }
});

// Routes

// Login with Email & Dynamic OTP
app.post('/login', async (req, res) => {
    const { email, password, mfaCode } = req.body;

    // Step 1: Validate Credentials
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';

    db.query(query, [email, password], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            const user = results[0];

            // Step 2: MFA Handling
            if (!mfaCode) {
                // Generate OTP
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                otpStore.set(email, otp);

                // Log to file for verification
                const fs = require('fs');
                fs.appendFileSync('otp_log.txt', `Email: ${email}, OTP: ${otp}\n`);

                // Send Email
                const mailOptions = {
                    from: 'Academic Security <noreply@academic.edu>',
                    to: email,
                    subject: 'Your Login Verification Code',
                    text: `Your OTP is: ${otp}`
                };

                try {
                    // await transporter.sendMail(mailOptions); // Uncomment for real email
                    console.log(`[SIMULATION] Email sent to ${email} with OTP: ${otp}`); // Log for demo

                    return res.json({
                        success: false,
                        requireMfa: true,
                        message: `OTP sent to ${email}`
                    });
                } catch (emailErr) {
                    console.error("Email Error:", emailErr);
                    return res.status(500).json({ error: 'Failed to send OTP' });
                }

            } else {
                // Verify OTP
                const storedOtp = otpStore.get(email);

                if (storedOtp && storedOtp === mfaCode) {
                    otpStore.delete(email); // Clear OTP
                    return res.json({ success: true, role: user.role, username: user.username });
                } else {
                    return res.status(401).json({ success: false, message: 'Invalid or Expired OTP' });
                }
            }
        } else {
            res.status(401).json({ success: false, message: 'Invalid Credentials' });
        }
    });
});

// Get Security Events
app.get('/events', (req, res) => {
    const query = 'SELECT * FROM security_events ORDER BY timestamp DESC';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get Activity Logs
app.get('/activity-logs', (req, res) => {
    const query = 'SELECT * FROM activity_logs ORDER BY timestamp DESC';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Log Activity
app.post('/log', (req, res) => {
    const { username, role, action } = req.body;
    const query = 'INSERT INTO activity_logs (username, role, action) VALUES (?, ?, ?)';
    db.query(query, [username, role, action], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

// Serve Frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
