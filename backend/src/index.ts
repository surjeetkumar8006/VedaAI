import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Configurations
dotenv.config();
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { initQueue } from './queues/queueManager';
import { initWorker } from './workers/workerManager';
import { initWebSocket } from './services/websocket';

// Routes
import assignmentRoutes from './routes/assignment';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // In production, replace with specific domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure public directories exist
const publicDir = path.join(__dirname, '..', 'public');
const pdfsDir = path.join(publicDir, 'pdfs');
const uploadsDir = path.join(publicDir, 'uploads');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Serve static assets
app.use('/public', express.static(publicDir));
// Specifically direct route for pdf download convenience
app.use('/pdfs', express.static(pdfsDir));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Mount Routes
app.use('/api/assignments', assignmentRoutes);

// Create HTTP and socket servers
const server = http.createServer(app);
initWebSocket(server);

// Start Server
const startServer = async () => {
  // Connect to DB
  await connectDB();

  // Try Redis
  connectRedis();

  // Initialize background jobs system
  initQueue();
  initWorker();

  server.listen(PORT, () => {
    console.log(`🚀 VedaAI Backend Server running on http://localhost:${PORT}`);
  });
};

startServer().catch(err => {
  console.error('❌ Server startup crashed:', err);
});
