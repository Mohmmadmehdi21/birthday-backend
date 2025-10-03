// index.js - Integration with Google Sheets (Render Safe + Clean Logs)

const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
// const nodemailer = require('nodemailer'); // REMOVED: Nodemailer dependency

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ===============================
// 0. Write credentials/token from env to files (if not present)
// ===============================
let CREDENTIALS, TOKEN;

try {
    if (!fs.existsSync('credentials.json') && process.env.CREDENTIALS_JSON) {
        const creds = process.env.CREDENTIALS_JSON.replace(/\\n/g, '\n');
        fs.writeFileSync('credentials.json', creds);
        console.log("✅ credentials.json written from ENV");
    }
    CREDENTIALS = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));

    if (!fs.existsSync('token.json') && process.env.TOKEN_JSON) {
        const token = process.env.TOKEN_JSON.replace(/\\n/g, '\n');
        fs.writeFileSync('token.json', token);
        console.log("✅ token.json written from ENV");
    }
    TOKEN = JSON.parse(fs.readFileSync('token.json', 'utf8'));
    
} catch (err) {
    console.error("❌ Fatal Error: Could not read or create credentials/token files. Google Sheets will not work.", err);
}

// ===============================
// 1. Google Sheets API Setup
// ===============================
let sheets;
const SPREADSHEET_ID = process.env.SHEET_ID || '1Df-jxPcd54-17ML4iWrbQUaZHshRSeSBHkNmZzskeC4';
const SHEET_NAME = process.env.SHEET_NAME || 'Sheet1';

if (CREDENTIALS && TOKEN) {
    try {
        const auth = new google.auth.OAuth2(
            CREDENTIALS?.installed?.client_id,
            CREDENTIALS?.installed?.client_secret,
            CREDENTIALS?.installed?.redirect_uris[0]
        );
        auth.setCredentials(TOKEN);
        sheets = google.sheets({ version: 'v4', auth });
        console.log("✅ Google Sheets API initialized.");
    } catch (authError) {
        console.error("❌ Error initializing Google Sheets Auth:", authError);
    }
} else {
    console.error("❌ Google Sheets API NOT initialized due to missing credentials.");
}


// ===============================
// 2. Transporter Setup (REMOVED)
// ===============================
// REMOVED: Nodemailer transporter code


// ===============================
// 3. API Endpoint
// ===============================
app.post('/submit-wish', async (req, res) => {
    try {
        const { wish } = req.body;
        if (!wish || wish.length === 0) {
            return res.status(400).json({ success: false, message: 'Wish content is missing.' });
        }

        console.log(`📩 Received wish: "${wish}"`);
        const timestamp = new Date().toISOString();
        
        // --- 1. Save to Google Sheet (Primary Critical Action) ---
        if (!sheets) {
             // If sheets wasn't initialized, fail fast and inform the user
             throw new Error("Google Sheets API is not configured or failed to authenticate at startup.");
        }
        
        const values = [[timestamp, wish]];
        const resource = { values };

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:B`,
            valueInputOption: 'RAW',
            resource,
        });
        console.log("✅ Wish successfully saved to Google Sheet");

        // --- 2. Send Email Notification (REMOVED) ---
        // REMOVED: Email sending block to eliminate debug logs.

        // Send SUCCESS response to the frontend ONLY AFTER the sheet save is successful
        res.status(200).json({
            success: true,
            message: 'Wish saved to Google Sheets successfully.'
        });

    } catch (error) {
        console.error('❌ Error in /submit-wish:', error.message);
        // Send a detailed FAILURE response so the frontend can display an error alert
        res.status(500).json({
            success: false,
            message: 'Internal server error. Wish was not saved.',
            error: error.message
        });
    }
});

// ===============================
// 4. Start the server
// ===============================
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`Submit wishes at http://localhost:${PORT}/submit-wish`);
});