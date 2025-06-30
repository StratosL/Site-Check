const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
require('dotenv').config();

// ===== CONFIGURATION =====
// Email configuration - Replace with your SMTP settings
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
};

// Recipient email for notifications
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'admin@example.com';

// Check interval (in minutes)
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || 60;

// Request timeout (in milliseconds)
const REQUEST_TIMEOUT = 10000; // 10 seconds

// ===== DATABASE SETUP =====
const DB_PATH = path.join(__dirname, 'db.json');

// Initialize database
async function initDB() {
  try {
    await fs.access(DB_PATH);
  } catch {
    // Create db.json if it doesn't exist
    await fs.writeFile(DB_PATH, JSON.stringify({ websites: [] }, null, 2));
  }
}

// Read database
async function readDB() {
  const data = await fs.readFile(DB_PATH, 'utf8');
  return JSON.parse(data);
}

// Write to database
async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== EXPRESS APP SETUP =====
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===== EMAIL SERVICE =====
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// Verify email configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('Email configuration error:', error);
    console.log('Warning: Email notifications will not work until SMTP is properly configured.');
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Send email notification
async function sendEmailNotification(website) {
  const mailOptions = {
    from: EMAIL_CONFIG.auth.user,
    to: NOTIFICATION_EMAIL,
    subject: `URGENT: Website Offline - ${website.url}`,
    text: `The website ${website.url} was detected as offline at ${new Date().toLocaleString()}. Please check its status.`,
    html: `
      <h2>Website Offline Alert</h2>
      <p><strong>Website:</strong> ${website.url}</p>
      <p><strong>Detected at:</strong> ${new Date().toLocaleString()}</p>
      <p>The website was detected as offline. Please check its status.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email notification sent for ${website.url}`);
  } catch (error) {
    console.error(`Failed to send email for ${website.url}:`, error);
  }
}

// ===== WEBSITE STATUS CHECKER =====
async function checkWebsiteStatus(url) {
  try {
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      validateStatus: function (status) {
        // Consider 2xx and 3xx as success
        return status >= 200 && status < 400;
      },
      // Use HEAD request if supported, otherwise fall back to GET
      method: 'HEAD',
      maxRedirects: 5
    });
    return 'Online';
  } catch (error) {
    // Try GET if HEAD fails
    if (error.code === 'ERR_BAD_REQUEST' || error.response?.status === 405) {
      try {
        const response = await axios.get(url, {
          timeout: REQUEST_TIMEOUT,
          validateStatus: function (status) {
            return status >= 200 && status < 400;
          },
          maxRedirects: 5
        });
        return 'Online';
      } catch (getError) {
        return 'Offline';
      }
    }
    return 'Offline';
  }
}

// Check all websites and update their status
async function checkAllWebsites() {
  console.log(`[${new Date().toLocaleString()}] Starting website status check...`);
  
  const db = await readDB();
  let hasChanges = false;

  for (const website of db.websites) {
    const previousStatus = website.status;
    const currentStatus = await checkWebsiteStatus(website.url);
    
    console.log(`Checking ${website.url}: ${previousStatus} -> ${currentStatus}`);
    
    // Update status and last checked time
    website.status = currentStatus;
    website.lastChecked = new Date().toISOString();
    
    // Send email only if status changed from Online to Offline
    if (previousStatus === 'Online' && currentStatus === 'Offline') {
      await sendEmailNotification(website);
    }
    
    hasChanges = true;
  }

  if (hasChanges) {
    await writeDB(db);
  }
  
  console.log(`[${new Date().toLocaleString()}] Website status check completed.`);
}

// ===== API ENDPOINTS =====

// Get all websites
app.get('/api/websites', async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.websites);
  } catch (error) {
    console.error('Error reading websites:', error);
    res.status(500).json({ error: 'Failed to fetch websites' });
  }
});

// Add a new website
app.post('/api/websites', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const db = await readDB();
    
    // Check if URL already exists
    if (db.websites.some(w => w.url === url)) {
      return res.status(400).json({ error: 'Website already exists' });
    }
    
    // Create new website entry
    const newWebsite = {
      id: crypto.randomUUID(),
      url: url,
      status: 'Checking...',
      lastChecked: null,
      addedAt: new Date().toISOString()
    };
    
    db.websites.push(newWebsite);
    await writeDB(db);
    
    // Check status immediately
    setTimeout(async () => {
      const status = await checkWebsiteStatus(url);
      const db = await readDB();
      const website = db.websites.find(w => w.id === newWebsite.id);
      if (website) {
        website.status = status;
        website.lastChecked = new Date().toISOString();
        await writeDB(db);
      }
    }, 0);
    
    res.status(201).json(newWebsite);
  } catch (error) {
    console.error('Error adding website:', error);
    res.status(500).json({ error: 'Failed to add website' });
  }
});

// Delete a website
app.delete('/api/websites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDB();
    
    const index = db.websites.findIndex(w => w.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Website not found' });
    }
    
    db.websites.splice(index, 1);
    await writeDB(db);
    
    res.status(200).json({ message: 'Website removed successfully' });
  } catch (error) {
    console.error('Error deleting website:', error);
    res.status(500).json({ error: 'Failed to delete website' });
  }
});

// ===== SCHEDULED TASKS =====

// Schedule status checks every CHECK_INTERVAL minutes
cron.schedule(`*/${CHECK_INTERVAL} * * * *`, checkAllWebsites);

// ===== SERVER STARTUP =====
async function startServer() {
  try {
    // Initialize database
    await initDB();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Site-Check server running on http://localhost:${PORT}`);
      console.log(`Status checks will run every ${CHECK_INTERVAL} minutes`);
      
      // Run initial check
      checkAllWebsites();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();