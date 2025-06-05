import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb+srv://ilyassouladdahman:1uNujtiEm39P9TyF@cluster0.ktxhbcg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const connectDB = async () => {
    try {
        await mongoose.connect(uri, {
            // useNewUrlParser: true, // Deprecated in Mongoose 6+
            // useUnifiedTopology: true, // Deprecated in Mongoose 6+
            // serverSelectionTimeoutMS: 5000, // Configure this if needed, but defaults are often fine
        });
        console.log('MongoDB Connected successfully using Mongoose');
    } catch (error) {
        console.error('Error connecting to MongoDB with Mongoose:', error.message);
        // Log the full error for more details if needed
        // console.error(error);
        process.exit(1);
    }
};

// getDB is typically not needed when using Mongoose's default connection.
// Mongoose models will use this connection automatically.

export default {
    connectDB,
    // getDB, // Removed as Mongoose handles the connection globally
};
