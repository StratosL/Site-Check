# Site-Check - Website Monitoring Service

A simple, production-ready web application that monitors websites and sends email notifications when they go offline.

## Features

- **Simple Web Interface**: Clean, responsive UI for adding and managing monitored websites
- **Automatic Status Checking**: Background job runs every 60 minutes to check website status
- **Email Notifications**: Sends email alerts when a website goes from "Online" to "Offline"
- **Smart State Management**: Prevents duplicate emails for sites that remain offline
- **File-Based Database**: Uses a simple JSON file for data persistence
- **Real-time Updates**: Auto-refreshes status on the UI every 30 seconds

![Screenshot] (https://stratoslouvaris.gr/wp-content/uploads/2025/07/sitecheck.png)

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- SMTP email account for sending notifications (e.g., Gmail, SendGrid, etc.)
- Docker & Docker compose (Recommended)

## Installation & Setup

Clone the repository and navigate to the project directory:
```bash
git clone stable https://github.com/StratosL/Site-Check.git
cd Site-Check
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Email Settings

Before running the services, you need to set up your environment variables.

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit the `.env` file with your email configuration:

```env
# SMTP Configuration for Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email address to receive notifications
NOTIFICATION_EMAIL=admin@example.com

# Check interval in minutes (default: 60)
CHECK_INTERVAL=60

# Server port (default: 3000)
PORT=3000
```

#### Gmail Configuration Example:
1. Enable 2-factor authentication on your Gmail account
2. Generate an app password: https://myaccount.google.com/apppasswords
3. Use your Gmail address as `SMTP_USER` and the app password as `SMTP_PASS`

Correct Formatting

Let's say your App Password is:

abcd efgh ijkl mnop

In your .env file, it should look like this, with no spaces:

EMAIL_PASS="abcdefghijklmnop"


### 4. Start the Application With Docker (Recommended)

In the directory Site-Check run: docker compose up -d

### 4.1 Start the Application without Docker (If you don't want docker)

For production:
```bash
npm start
```

For development (with auto-restart):
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## File Structure

```
site-check/
├── server.js           # Main server file with all backend logic
├── package.json        # Node.js dependencies and scripts
├── .env               # Environment configuration (create from .env.example)
├── .env.example       # Example environment configuration
├── db.json            # Database file (auto-created)
├── README.md          # This file
└── public/            # Frontend files
    ├── index.html     # Main HTML file
    ├── style.css      # Styles
    └── script.js      # Frontend JavaScript
```

## Usage

1. **Access the Application**: Open `http://localhost:3000` in your web browser

2. **Add a Website**: 
   - Enter a URL in the input field (e.g., `https://example.com`)
   - Click "Add Website" or press Enter
   - The website will be added with status "Checking..."

3. **Monitor Status**:
   - Websites are checked every 60 minutes
   - Status updates automatically on the UI every 30 seconds
   - Possible statuses: "Online", "Offline", or "Checking..."

4. **Remove a Website**:
   - Click the "Remove" button next to any website
   - Confirm the removal when prompted

## How It Works

### Status Checking Logic
- Each website is checked with an HTTP HEAD request (falls back to GET if needed)
- 10-second timeout for each request
- Status codes 2xx and 3xx are considered "Online"
- Any other response or timeout is considered "Offline"

### Email Notifications
- Emails are sent ONLY when a site changes from "Online" to "Offline"
- No duplicate emails for sites that remain offline
- Email includes the website URL and timestamp

### Data Storage
- All data is stored in `db.json` file
- Automatically created on first run
- Human-readable JSON format

## Troubleshooting

### Email Not Sending
1. Check your SMTP credentials in `.env`
2. Ensure your firewall allows outgoing connections on the SMTP port
3. For Gmail, make sure you're using an app password, not your regular password
4. Check the console logs for specific error messages

### Website Always Shows Offline
1. Ensure the URL includes the protocol (http:// or https://)
2. Check if the website is accessible from your server
3. Some websites block automated requests - try a different site

### Port Already in Use
Change the port in `.env` file:
```env
PORT=3001
```

## Security Considerations

1. **Never commit `.env` file** to version control
2. Use strong passwords for email accounts
3. Consider rate limiting for the API endpoints in production
4. Implement authentication if deploying publicly

## Production Deployment

For production deployment, consider:

1. Using a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name site-check
   ```

2. Setting up a reverse proxy with Nginx

3. Using a more robust database solution for high-scale deployments

4. Implementing user authentication and multi-tenancy

5. Adding HTTPS with SSL certificates

## License

This project is provided as-is for educational and commercial use.
