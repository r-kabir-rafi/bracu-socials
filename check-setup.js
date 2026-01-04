const fs = require('fs');
const path = require('path');

console.log('🔍 BRACu Socials - Setup Verification\n');

const envExists = fs.existsSync('.env');
console.log(`${envExists ? '✅' : '❌'} .env file ${envExists ? 'exists' : 'not found'}`);

if (envExists) {
    require('dotenv').config();
    console.log('   - Checking environment variables...');
    
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
    let allVarsPresent = true;
    
    requiredVars.forEach(varName => {
        const exists = !!process.env[varName];
        console.log(`   ${exists ? '✅' : '❌'} ${varName} ${exists ? 'set' : 'missing'}`);
        if (!exists) allVarsPresent = false;
    });
    
    if (!allVarsPresent) {
        console.log('\n⚠️  Please set all required environment variables in .env file');
    }
} else {
    console.log('   ⚠️  Copy .env.example to .env and configure it');
}

const uploadsExists = fs.existsSync('uploads');
console.log(`\n${uploadsExists ? '✅' : '❌'} uploads/ directory ${uploadsExists ? 'exists' : 'not found'}`);

if (!uploadsExists) {
    console.log('   Creating uploads directory...');
    fs.mkdirSync('uploads', { recursive: true });
    console.log('   ✅ uploads/ directory created');
}

if (envExists) {
    console.log('\n🔌 Testing database connection...');
    
    const mysql = require('mysql2');
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    connection.connect((err) => {
        if (err) {
            console.log('❌ Database connection failed');
            console.log('   Error:', err.message);
            console.log('\n   Please ensure:');
            console.log('   1. MySQL is running');
            console.log('   2. Database credentials in .env are correct');
            console.log('   3. Database "bracu_socials" exists');
            console.log('   4. Run: mysql -u root -p < database/schema.sql');
        } else {
            console.log('✅ Database connection successful');
            
            connection.query('SHOW TABLES', (err, results) => {
                if (err) {
                    console.log('❌ Error checking tables:', err.message);
                } else {
                    console.log(`   Found ${results.length} tables in database`);
                    
                    if (results.length === 0) {
                        console.log('   ⚠️  No tables found. Please run: mysql -u root -p < database/schema.sql');
                    } else {
                        console.log('   ✅ Database schema appears to be set up');
                    }
                }
                connection.end();
                
                console.log('\n📋 Setup Status Summary:');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                if (envExists && uploadsExists) {
                    console.log('✅ Configuration files are in place');
                    console.log('✅ Upload directory is ready');
                    console.log('\n🚀 You can now start the server with: npm start');
                    console.log('   Or for development: npm run dev');
                    console.log('\n   Access the app at: http://localhost:' + (process.env.PORT || 3000));
                } else {
                    console.log('⚠️  Please complete the setup steps above');
                    console.log('   See SETUP.md for detailed instructions');
                }
                
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            });
        }
    });
} else {
    console.log('\n⚠️  Cannot test database connection without .env file');
    console.log('   Please create .env file first (copy from .env.example)');
}
