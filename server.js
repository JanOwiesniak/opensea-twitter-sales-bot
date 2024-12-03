const express = require('express');
require('dotenv').config();
const { authEmitter } = require('./auth');

const app = express();
const AUTH_SERVER_PORT = process.env.AUTH_SERVER_PORT || 3000;

// Callback route to handle OAuth 2.0 redirect
app.get('/callback', (req, res) => {
    const code = req.query.code;
    if (code) {
        console.log('Authorization code received:', code);
        res.send('Authorization code received and stored. You can now close this window.');
        authEmitter.emit('authorized', code);
    } else {
        res.send('Authorization code not found.');
    }
});

const server = app.listen(AUTH_SERVER_PORT, () => {
    console.log(`Server is running on port ${AUTH_SERVER_PORT}`);
});

module.exports = { server };
