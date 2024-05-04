import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config()

const DB: string = process.env.MONGODB_URI || '';

async function main() {
  try {
    await mongoose.connect(DB);
    console.log('Connected to the database');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

export default main;