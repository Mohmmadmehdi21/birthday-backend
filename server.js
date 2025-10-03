// server.js - Integration with Google Sheets + Email Notification (Env Vars Version)

const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // For production: app.use(cors({ origin: "https://your-frontend.tinyhost.com" }));
app.use(express.json());

// ===============================
// 0. Write credentials/token from env to files (if not present)
// ===============================
if (!fs.existsSync('credentials.json') && process.env.CREDENTIALS_JSON) {
  fs.writeFileSync('credentials.json', process.env.CREDENTIALS_JSON);
}
if (!fs.existsSync('token.json') && process.env.TOKEN_JSON) {
  fs.writeFileSync('token.json', process.env.TOKEN_JSON);
}

// ===============================
// 1. Google Sheets API Setup
// ===============================
const CREDENTIALS = JSON.parse(fs.readFileSync('credentials.json'));
const TOKEN = JSON.parse(fs.readFileSync('token.json'));

const auth = new google.auth.OAuth2(
  CREDENTIALS.installed.client_id,
  CREDENTIALS.installed.client_secret,
  CREDENTIALS.installed.redirect_uris[0]
);
auth.setCredentials(TOKEN);

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SHEET_ID || '1Df-jxPcd54-17ML4iWrbQUaZHshRSeSBHkNmZzskeC4';
const SHEET_NAME = process.env.SHEET_NAME || 'Sheet1';

// ===============================
// 2. Nodemailer Transporter Setup
// ===============================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,   // Gmail ID from env
    pass: process.env.EMAIL_PASS    // Gmail App Password from env
  }
});

// ===============================
// 3. API Endpoint
// ===============================
app.post('/submit-wish', async (req, res) => {
  try {
    const { wish } = req.body;
    if (!wish || wish.length === 0) {
      return res.status(400).json({ success: false, message: 'Wish content is missing.' });
    }

    console.log(`Received wish: "${wish}"`);

    // Save to Google Sheet
    const values = [[new Date().toISOString(), wish]];
    const resource = { values };

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:B`,
      valueInputOption: 'RAW',
      resource,
    });

    // Send Email Notification
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || 'mohmmadmehdi44@gmail.com',
      subject: '🎉 Birthday Wish Submitted!',
      text: `Wish: ${wish}\nTime: ${new Date().toISOString()}`
    });

    res.status(200).json({
      success: true,
      message: 'Wish saved to Google Sheets & email sent successfully!'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
      error: error.message
    });
  }
});

// ===============================
// 4. (Optional) Serve frontend if needed
// ===============================
// app.use(express.static(path.join(__dirname, 'public')));
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// ===============================
// 5. Start the server
// ===============================
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`Submit wishes at http://localhost:${PORT}/submit-wish`);
});
