const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');

async function startServer() {
  try {
    await connectDB();
    console.log('MongoDB connection established.');
  } catch (err) {
    console.warn('Warning: Could not connect to MongoDB on startup:', err.message);
    console.warn('Ensure MongoDB is running and DATABASE_URL is configured in backend/.env.');
  }

  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port} (${env.nodeEnv})`);
  });
}

startServer();
