import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Ensure Node's DNS resolver uses reliable public DNS servers for MongoDB Atlas SRV lookups on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore DNS set error if system restricts it
}

export const connectDB = async () => {
  const dbUrl = process.env.DATABASE_URL;

  try {
    if (dbUrl) {
      const conn = await mongoose.connect(dbUrl, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    }
  } catch (error) {
    console.warn(`⚠️ Primary MongoDB Connection failed: ${error.message}`);
  }

  // Attempt fallback connection to local MongoDB if primary failed or not provided
  console.log('🔄 Attempting fallback connection to local MongoDB...');
  try {
    const localUrl = process.env.LOCAL_DATABASE_URL && !process.env.LOCAL_DATABASE_URL.includes('mongodb+srv://')
      ? process.env.LOCAL_DATABASE_URL
      : 'mongodb://127.0.0.1:27017/cafe_db';
    const conn = await mongoose.connect(localUrl, { serverSelectionTimeoutMS: 3000 });
    console.log(`✅ Local MongoDB Connected: ${conn.connection.host}`);
  } catch (localError) {
    console.error(`❌ Mongoose Connection Error: ${localError.message}`);
    console.log('ℹ️ Server running with REST API endpoints (Database optional / mock mode active)');
  }
};
