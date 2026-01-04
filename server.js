const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend')));

app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/friends', require('./backend/routes/friends'));
app.use('/api/schedule', require('./backend/routes/schedule'));
app.use('/api/location', require('./backend/routes/location'));
app.use('/api/groups', require('./backend/routes/groups'));
app.use('/api/events', require('./backend/routes/events'));
app.use('/api/notifications', require('./backend/routes/notifications'));
app.use('/api/smart-matching', require('./backend/routes/smartMatching'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/pages/index.html'));
});

const servePage = (pageName) => (req, res) => {
    res.sendFile(path.join(__dirname, `frontend/pages/${pageName}.html`));
};

const pages = ['login', 'register', 'dashboard', 'profile', 'friends', 'schedule', 'location', 'groups', 'events', 'notifications', 'view-profile', 'forgot-password', 'reset-password', 'view-group', 'view-event'];
pages.forEach(page => {
    app.get(`/${page}`, servePage(page));
    app.get(`/${page}.html`, servePage(page));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/pages/index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`BRACu Socials server running on http://localhost:${PORT}`);
});

module.exports = app;
