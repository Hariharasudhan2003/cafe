import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async () => {
  const dbUrl = process.env.DATABASE_URL || process.env.LOCAL_DATABASE_URL;

  try {
    const conn = await mongoose.connect(dbUrl, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ Primary MongoDB Connection failed: ${error.message}`);
    console.log('🔄 Attempting fallback connection to local MongoDB...');
    try {
      const localUrl = process.env.LOCAL_DATABASE_URL || 'mongodb://localhost:27017/cafe_db';
      const conn = await mongoose.connect(localUrl, { serverSelectionTimeoutMS: 3000 });
      console.log(`✅ Local MongoDB Connected: ${conn.connection.host}`);
    } catch (localError) {
      console.error(`❌ Mongoose Connection Error: ${localError.message}`);
      console.log('ℹ️ Server running with REST API endpoints (Database optional / mock mode active)');
    }
  }
};
