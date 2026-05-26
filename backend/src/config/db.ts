import mongoose from 'mongoose';

export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vedaai';
  // Fallback to live Atlas cluster if local database connection isn't specified
  const targetURI = process.env.MONGODB_URI || 'mongodb+srv://surjeetkumarcareer_db_user:7AJ2C8zcbhVSuz16@cluster0.cra4jdd.mongodb.net/vedaai?retryWrites=true&w=majority';
  try {
    await mongoose.connect(targetURI);
    console.log('⚡ Connected to MongoDB successfully.');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};
