const express = require('express');
const WebSocket = require('ws');
const cron = require('node-cron');

const app = express();
const port = 3000;
app.use(express.json());

// In-memory event storage
const events = [];

// WebSocket setup
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });
const connectedClients = new Set();

// Handle WebSocket connections
wss.on('connection', (ws) => {
    connectedClients.add(ws);
    ws.send(JSON.stringify({ message: 'Connected to Real-Time Event Notifier' }));

    ws.on('close', () => {
        connectedClients.delete(ws);
    });
});

// Endpoint to Add Event
app.post('/events', (req, res) => {
    const { title, description, time } = req.body;
    if (!title || !time) {
        return res.status(400).json({ error: 'Title and time are required' });
    }

    const eventTime = new Date(time);
    if (isNaN(eventTime)) {
        return res.status(400).json({ error: 'Invalid date format' });
    }

    const event = { title, description, time: eventTime };
    events.push(event);
    res.status(201).json({ message: 'Event added successfully', event });
});

// Endpoint to Get Events
app.get('/events', (req, res) => {
    res.json(events);
});

// Function to notify clients
function notifyClients(event) {
    connectedClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ message: `Event Reminder: ${event.title} starts soon!` }));
        }
    });
}

// Cron job to check for upcoming events every minute
cron.schedule('* * * * *', () => {
    const now = new Date();
    events.forEach(event => {
        const timeDiff = event.time - now;
        if (timeDiff <= 5 * 60 * 1000 && timeDiff > 0) {
            notifyClients(event);  // Send notifications even if overlapping
        }
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server running on http://localhost:3000`);
});
