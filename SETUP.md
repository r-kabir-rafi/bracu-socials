# BRACu Socials - Setup Guide

## Quick Start

Follow these steps to get BRACu Socials running on your local machine:

### 1. Database Setup

First, make sure MySQL is installed and running on your system.

Create the database and tables:
```bash
# Login to MySQL
mysql -u root -p

# Inside MySQL console, run:
source database/schema.sql;

# Or alternatively from command line:
mysql -u root -p < database/schema.sql
```

### 2. Environment Configuration

Copy the example environment file and update it with your settings:
```bash
cp .env.example .env
```

Edit `.env` and update the following:
```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bracu_socials
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
```

**Note**: For Gmail, you'll need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

For production:
```bash
npm start
```

For development (with auto-reload):
```bash
npm run dev
```

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Testing the Application

### Create Your First Account

1. Go to http://localhost:3000
2. Click "Register"
3. Fill in the form with a BRAC University email (e.g., `test@g.bracu.ac.bd`)
4. Complete the registration
5. For development, the verification token will be logged to the console
6. Use the verification link or mark the email as verified directly in the database:
   ```sql
   UPDATE USERS SET Email_verified = TRUE WHERE Email = 'your_email@g.bracu.ac.bd';
   ```

### Test Key Features

1. **Login**: Use your credentials to log in
2. **Complete Profile**: Add your interests and upload a profile picture
3. **Add Friends**: Search for other users and send friend requests
4. **Create Schedule**: Add your class schedule
5. **Check-in**: Check in at campus locations
6. **Create Group**: Create an interest-based group
7. **Create Event**: Organize an event and invite friends

## Common Issues and Solutions

### Database Connection Error
- Ensure MySQL is running
- Verify database credentials in `.env`
- Check if the database `bracu_socials` exists

### Port Already in Use
- Change the PORT in `.env` to a different value (e.g., 3001)
- Or stop the process using port 3000:
  ```bash
  # On Linux/Mac
  lsof -ti:3000 | xargs kill -9
  
  # On Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```

### Email Verification Not Working
- For development, you can manually verify users in the database
- Check email credentials in `.env`
- Ensure "Less secure app access" or "App Passwords" are configured for Gmail

### Upload Directory Permission Error
- Ensure the `uploads/` directory exists and has write permissions:
  ```bash
  mkdir -p uploads
  chmod 755 uploads
  ```

## Development Notes

- The application uses JWT for authentication
- Tokens expire after 24 hours
- All API endpoints (except auth) require authentication
- User passwords are hashed using bcrypt
- File uploads are limited to 5MB

## Next Steps

After setting up:
1. Create multiple test accounts to test the social features
2. Explore the friend request system
3. Test the group and event creation
4. Try the location check-in feature
5. Test the smart matching suggestions

## Need Help?

If you encounter any issues:
1. Check the console for error messages
2. Verify your `.env` configuration
3. Ensure all dependencies are installed
4. Check that MySQL is running and accessible
5. Review the README.md for detailed API documentation

Happy coding! 🎉
