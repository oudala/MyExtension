import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import database from './config/database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import linksRoutes from './routes/links.js';
import notificationRoutes from './routes/notifications.js';
import { setupSocket } from './sockets/socketHandler.js';
import { errorHandler, notFound } from './middlewares/error.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Connect to MongoDB with reconnection logic
const connectWithRetry = async (retries = 5, interval = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await database.connectDB();
      console.log('📊 MongoDB Connected successfully');
      return true;
    } catch (error) {
      if (i === retries - 1) {
        console.error('❌ Failed to connect to MongoDB after', retries, 'attempts');
        throw error;
      }
      console.error(`❌ MongoDB connection attempt ${i + 1} failed:`, error.message);
      console.log(`🔄 Retrying in ${interval / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  return false;
};

// Initialize server
const initializeServer = async () => {
  try {
    // Connect to MongoDB first
    await connectWithRetry();

    // Trust proxy (for rate limiting behind reverse proxy)
    app.set('trust proxy', 1);

    // Security middleware
    app.use(helmet());
    app.use(compression());

    // Cookie parser middleware
    app.use(cookieParser());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again later.'
    });
    app.use('/api/', limiter);

    // CORS with credentials
    app.use(cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept'],
      exposedHeaders: ['set-cookie'],
      preflightContinue: false,
      optionsSuccessStatus: 204
    }));

    // Add preflight handler for all routes
    app.options('*', cors());

    // Body parsing middleware with increased limits
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (process.env.NODE_ENV === 'development') {
      app.use(morgan('dev'));
    }

    // Socket.io setup with error handling
    setupSocket(io);

    // Make io available to routes
    app.use((req, res, next) => {
      req.io = io;
      next();
    });

    // Health check with DB status
    app.get('/health', async (req, res) => {
      try {
        const dbStatus = database.isConnected() ? 'Connected' : 'Disconnected';
        res.json({
          status: 'OK',
          timestamp: new Date().toISOString(),
          database: dbStatus,
          uptime: process.uptime()
        });
      } catch (error) {
        res.status(500).json({
          status: 'ERROR',
          error: error.message
        });
      }
    });

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/links', linksRoutes);
    app.use('/api/notifications', notificationRoutes);

    // Error handling middleware
    app.use(notFound);
    app.use(errorHandler);

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = () => {
  console.log('🛑 Received shutdown signal. Starting graceful shutdown...');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    io.close(() => {
      console.log('✅ WebSocket server closed');
      
      database.disconnect()
        .then(() => {
          console.log('✅ Database connection closed');
          process.exit(0);
        })
        .catch(err => {
          console.error('❌ Error during database disconnection:', err);
          process.exit(1);
        });
    });
  });

  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle various shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Initialize the server
initializeServer().catch(error => {
  console.error('❌ Server initialization failed:', error);
  process.exit(1);
});

export default app;