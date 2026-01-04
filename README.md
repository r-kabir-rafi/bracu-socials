# BRACU-Socials

A comprehensive social networking platform for BRAC University students to connect, collaborate, and engage with their university community.

## Features

### User Account Management
- Create account with university email verification
- Complete profile with academic info and interests
- Upload profile picture
- Manage privacy settings

### Friend System
- Search for other students by name or ID
- Send and manage friend requests
- View friends list and mutual connections
- Block/unblock users

### Schedule Management
- Add weekly class schedule
- View friends' available time slots
- Find common free time with friends
- Control schedule privacy settings

### Live Location Sharing
- Check-in at campus locations (library, lab, cafe, etc.)
- Set status (studying, socializing, available to meet)
- Control location visibility (friends only/private)
- See friends currently nearby

### Interest-Based Groups
- Create groups based on hobbies
- Join existing groups
- Post in group discussions
- Manage group membership

### Event Creation & Management
- Create spontaneous events (study sessions, hangouts)
- Set event time, location, and participant limits
- Invite friends to events
- RSVP to event invitations

### Smart Matching System
- Friend suggestions based on common interests
- Common free time with friends
- Nearby friends available to meet
- Group recommendations based on interests

### Real-time Notifications
- Friend request alerts
- Event invitation notifications
- Check-in notifications
- Schedule match suggestions

### Privacy Controls
- Control profile visibility
- Hide location when needed
- Set different privacy levels for different content
- Block other users if needed

### Search & Discovery
- Search for people by department/year
- Browse interest-based groups
- Find events happening nearby
- Discover popular campus spots

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm (comes with Node.js)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/kopotrahman/BRACU-Socials.git
   cd BRACU-Socials
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   - Create a MySQL database
   - Run the schema file:
   ```bash
   mysql -u your_username -p your_database_name < database/schema.sql
   ```

4. **Configure environment variables**
   - Copy `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```
   - Update the `.env` file with your configuration:
   ```
   PORT=3000
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=bracu_socials
   JWT_SECRET=your_jwt_secret_key_here
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_email_password
   ```

5. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
BRACU-Socials/
├── backend/
│   ├── config/
│   │   └── database.js          # Database connection
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── friendsController.js # Friends management
│   │   ├── scheduleController.js
│   │   ├── locationController.js
│   │   ├── groupsController.js
│   │   ├── eventsController.js
│   │   ├── notificationsController.js
│   │   └── smartMatchingController.js
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   └── upload.js            # File upload middleware
│   └── routes/
│       ├── auth.js
│       ├── friends.js
│       ├── schedule.js
│       ├── location.js
│       ├── groups.js
│       ├── events.js
│       ├── notifications.js
│       └── smartMatching.js
├── database/
│   └── schema.sql               # Database schema
├── frontend/
│   ├── css/
│   │   └── style.css           # Main stylesheet
│   ├── js/
│   │   └── utils.js            # Utility functions
│   └── pages/
│       ├── index.html          # Landing page
│       ├── login.html
│       ├── register.html
│       ├── dashboard.html
│       ├── profile.html
│       ├── friends.html
│       ├── schedule.html
│       ├── location.html
│       ├── groups.html
│       └── events.html
├── uploads/                     # User uploaded files
├── .env.example                # Environment variables template
├── .gitignore
├── package.json
├── server.js                   # Main server file
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/verify/:token` - Verify email
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/profile/picture` - Upload profile picture
- `PUT /api/auth/privacy` - Update privacy settings
- `POST /api/auth/logout` - Logout

### Friends
- `GET /api/friends/search` - Search users
- `POST /api/friends/request` - Send friend request
- `GET /api/friends/requests/incoming` - Get incoming requests
- `GET /api/friends/requests/sent` - Get sent requests
- `POST /api/friends/request/:id/accept` - Accept request
- `POST /api/friends/request/:id/decline` - Decline request
- `GET /api/friends/list` - Get friends list
- `DELETE /api/friends/:id` - Remove friend
- `POST /api/friends/block` - Block user

### Schedule
- `POST /api/schedule/class` - Add class
- `GET /api/schedule` - Get schedule
- `PUT /api/schedule/class/:code` - Update class
- `DELETE /api/schedule/class/:code` - Delete class

### Location
- `GET /api/location/spots` - Get campus spots
- `POST /api/location/checkin` - Check in
- `GET /api/location/nearby` - Get nearby friends
- `GET /api/location/history` - Get check-in history

### Groups
- `POST /api/groups` - Create group
- `GET /api/groups` - Get all groups
- `GET /api/groups/my-groups` - Get user's groups
- `POST /api/groups/:id/join` - Join group
- `POST /api/groups/posts` - Create post
- `GET /api/groups/:id/posts` - Get group posts

### Events
- `POST /api/events` - Create event
- `GET /api/events` - Get all events
- `GET /api/events/my-events` - Get user's events
- `POST /api/events/:id/rsvp` - RSVP to event
- `POST /api/events/:id/invite` - Invite friends

### Notifications
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read

### Smart Matching
- `GET /api/smart-matching/suggest-friends` - Get friend suggestions
- `GET /api/smart-matching/recommend-groups` - Get group recommendations
- `GET /api/smart-matching/recommend-nearby` - Get nearby friends
- `GET /api/smart-matching/popular-spots` - Get popular spots

## Usage

1. **Register**: Create an account using your BRAC University email
2. **Verify Email**: Check your email for verification link (in development, check console)
3. **Login**: Sign in with your credentials
4. **Complete Profile**: Add your interests and profile picture
5. **Find Friends**: Search and connect with other students
6. **Join Groups**: Discover and join interest-based groups
7. **Create Events**: Organize study sessions or hangouts
8. **Check-in**: Share your location with friends
9. **Manage Schedule**: Add your classes and find common free time

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Contact

For any queries or issues, please open an issue on GitHub.