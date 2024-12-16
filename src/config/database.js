const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log("DB_URI: ", process.env.DB_URI);
    await mongoose.connect(process.env.DB_URI)
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
