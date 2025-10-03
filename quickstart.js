// quickstart.js - generate token.json for Google Sheets API
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying scopes, delete token.json first
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.error('Error loading client secret file:', err);
  authorize(JSON.parse(content), listMajors);
});

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if token.json already exists
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      console.log('Token stored to', TOKEN_PATH);
      callback(oAuth2Client);
    });
  });
}

// Dummy function (just prints first 5 rows from sample sheet)
function listMajors(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: 'PUT-YOUR-SHEET-ID-HERE',
    range: 'Sheet1!A:B',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      console.log('Sample rows:');
      rows.map((row) => console.log(row));
    } else {
      console.log('No data found.');
    }
  });
}
