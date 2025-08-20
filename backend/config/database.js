const mongoose = require('mongoose');

// MongoDB connection options
const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  autoIndex: false, // Don't build indexes
  maxIdleTimeMS: 30000,
  family: 4 // Use IPv4, skip trying IPv6
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blockchain-voting';
    
    console.log('Connecting to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, mongoOptions);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Create indexes for better performance
const createIndexes = async () => {
  try {
    console.log('Creating database indexes...');
    
    // User indexes
    await mongoose.model('User').createIndexes();
    
    // Election indexes
    await mongoose.model('Election').createIndexes();
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

// Initialize database with sample data (development only)
const initializeDatabase = async () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('Initializing database with sample data...');
      
      const User = mongoose.model('User');
      const Election = mongoose.model('Election');
      
      // Check if sample data already exists
      const userCount = await User.countDocuments();
      const electionCount = await Election.countDocuments();
      
      if (userCount === 0) {
        // Create sample admin user
        const adminUser = new User({
          walletAddress: '0x1234567890123456789012345678901234567890',
          profileName: 'Admin User',
          email: 'admin@example.com',
          isAdmin: true,
          isVerified: true,
          profile: {
            bio: 'System administrator for the blockchain voting platform',
            location: 'Global',
            interests: ['blockchain', 'voting', 'democracy']
          }
        });
        
        await adminUser.save();
        console.log('Sample admin user created');
      }
      
      if (electionCount === 0) {
        // Create sample election
        const sampleElection = new Election({
          title: 'Sample Community Election',
          description: 'This is a sample election to demonstrate the platform functionality. Vote for your preferred candidate to see how the system works.',
          candidates: [
            {
              id: 1,
              name: 'Alice Johnson',
              description: 'Experienced community leader with focus on sustainability',
              imageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
            },
            {
              id: 2,
              name: 'Bob Smith',
              description: 'Innovation advocate with technology background',
              imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
            },
            {
              id: 3,
              name: 'Carol Davis',
              description: 'Education specialist promoting community learning',
              imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
            }
          ],
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
          category: 'Community',
          tags: ['community', 'leadership', 'sample'],
          creator: '0x1234567890123456789012345678901234567890',
          status: 'upcoming',
          maxVoters: 1000,
          requiresRegistration: false,
          votingMethod: 'single_choice',
          imageUrl: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800&h=400&fit=crop'
        });
        
        await sampleElection.save();
        console.log('Sample election created');
      }
      
      console.log('Database initialization completed');
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }
};

// Health check for database
const checkDatabaseHealth = async () => {
  try {
    const status = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      status: states[status] || 'unknown',
      readyState: status,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date()
    };
  }
};

module.exports = {
  connectDB,
  createIndexes,
  initializeDatabase,
  checkDatabaseHealth
};
