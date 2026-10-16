import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return mongoose;
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    return conn;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
};

export default connectDB;