const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://ilyassouladdahman:1uNujtiEm39P9TyF@cluster0.ktxhbcg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
});

let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

function getDB() {
    if (!db) {
        throw new Error('Database not connected. Please call connectDB() first.');
    }
    return db;
}

module.exports = {
    connectDB,
    getDB,
};
