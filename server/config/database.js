import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

class Database {
  constructor() {
    this.connection = null;
    this.connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    };

    // Set the MongoDB URI
    this.uri = 'mongodb+srv://ilyassouladdahman:1uNujtiEm39P9TyF@cluster0.ktxhbcg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  }

  async connectDB() {
    try {
      if (this.connection) {
        console.log('📊 Using existing database connection');
        return;
      }

      console.log('🔌 Attempting to connect to MongoDB Atlas...');
      
      // Set up mongoose connection events
      mongoose.connection.on('connected', () => {
        console.log('🔌 Mongoose connection established to MongoDB Atlas');
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ Mongoose connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('🔌 Mongoose connection disconnected');
      });

      // Connect with retry logic built into mongoose
      this.connection = await mongoose.connect(this.uri, this.connectionOptions);
      
      // Test the connection
      await mongoose.connection.db.admin().ping();
      console.log('✅ Successfully connected to MongoDB Atlas');
      
      return this.connection;
    } catch (error) {
      console.error('❌ Database connection error:', error);
      if (error.name === 'MongoServerSelectionError') {
        console.error('💡 Connection Troubleshooting:');
        console.error('1. Check your internet connection');
        console.error('2. Verify MongoDB Atlas cluster is running');
        console.error('3. Confirm IP address is whitelisted in Atlas');
        console.error('4. Validate connection string format');
      }
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.connection = null;
        console.log('🔌 Database disconnected successfully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
      throw error;
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  getConnection() {
    return this.connection;
  }
}

export default new Database();
