const fs = require('fs');
const path = require('path');

function removeJSComments(content) {
    content = content.replace(/^\s*\/\/.*$/gm, '');
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    return content;
}

function removeHTMLComments(content) {
    content = content.replace(/<!--[\s\S]*?-->/g, '');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    return content;
}

function removeCSSComments(content) {
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    return content;
}

function removeSQLComments(content) {
    content = content.replace(/--.*$/gm, '');
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    return content;
}

const jsFiles = [
    'server.js',
    'check-setup.js',
    'create-table.js',
    'backend/config/database.js',
    'backend/middleware/auth.js',
    'backend/middleware/upload.js',
    'backend/utils/email.js',
    'backend/routes/auth.js',
    'backend/routes/events.js',
    'backend/routes/friends.js',
    'backend/routes/groups.js',
    'backend/routes/location.js',
    'backend/routes/notifications.js',
    'backend/routes/schedule.js',
    'backend/routes/smartMatching.js',
    'backend/controllers/authController.js',
    'backend/controllers/eventsController.js',
    'backend/controllers/friendsController.js',
    'backend/controllers/groupsController.js',
    'backend/controllers/locationController.js',
    'backend/controllers/notificationsController.js',
    'backend/controllers/scheduleController.js',
    'backend/controllers/smartMatchingController.js',
    'frontend/js/utils.js'
];

jsFiles.forEach(f => {
    try {
        const content = fs.readFileSync(f, 'utf8');
        const cleaned = removeJSComments(content);
        fs.writeFileSync(f, cleaned);
        console.log('JS cleaned: ' + f);
    } catch (e) {
        console.log('Error: ' + f + ' - ' + e.message);
    }
});

const htmlDir = 'frontend/pages';
fs.readdirSync(htmlDir).filter(f => f.endsWith('.html')).forEach(file => {
    const filePath = path.join(htmlDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const cleaned = removeHTMLComments(content);
        fs.writeFileSync(filePath, cleaned);
        console.log('HTML cleaned: ' + filePath);
    } catch (e) {
        console.log('Error: ' + filePath + ' - ' + e.message);
    }
});

try {
    const cssContent = fs.readFileSync('frontend/css/style.css', 'utf8');
    fs.writeFileSync('frontend/css/style.css', removeCSSComments(cssContent));
    console.log('CSS cleaned: frontend/css/style.css');
} catch (e) {
    console.log('Error with CSS: ' + e.message);
}

try {
    const sqlContent = fs.readFileSync('database/schema.sql', 'utf8');
    fs.writeFileSync('database/schema.sql', removeSQLComments(sqlContent));
    console.log('SQL cleaned: database/schema.sql');
} catch (e) {
    console.log('Error with SQL: ' + e.message);
}

console.log('Done!');
