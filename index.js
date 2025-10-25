const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// --- 1. Database Connection ---
// IMPORTANT: Replace this with your own MongoDB connection string.
// You can get a free one from MongoDB Atlas or use a local install.
// Format: "mongodb+srv://<user>:<password>@cluster.mongodb.net/bankDB"
// Or for local: "mongodb://127.0.0.1:27017/bank-db"
const MONGO_URI = 'mongodb://127.0.0.1:27017/bank-db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- 2. Middleware ---
// This parses incoming JSON request bodies
app.use(express.json());

// --- 3. Mongoose Schema & Model ---
// This defines the structure for our user/account documents in MongoDB
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    required: true,
    min: 0 // Balance cannot be negative
  }
});

// The model is our primary interface for interacting with the 'users' collection
const User = mongoose.model('User', userSchema);

// --- 4. API Routes ---

/**
 * [POST] /create-users
 * A helper route to populate the database for testing.
 * This matches the first screenshot.
 */
app.post('/create-users', async (req, res) => {
  try {
    // Clear existing users for a clean test
    await User.deleteMany({});

    const usersData = [
      { name: 'Alice', balance: 1000 },
      { name: 'Bob', balance: 500 }
    ];
    const createdUsers = await User.insertMany(usersData);

    res.status(201).json({
      message: "Users created",
      users: createdUsers
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating users", error: error.message });
  }
});

/**
 * [POST] /transfer
 * The main task route to transfer money.
 * It performs application-level validation as required.
 */
app.post('/transfer', async (req, res) => {
  const { fromUserId, toUserId, amount } = req.body;

  // 1. Validate input
  if (!fromUserId || !toUserId || !amount) {
    return res.status(400).json({ message: "Missing fromUserId, toUserId, or amount" });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: "Invalid transfer amount" });
  }
  
  if (fromUserId === toUserId) {
    return res.status(400).json({ message: "Cannot transfer to the same account" });
  }

  try {
    // 2. Find both accounts
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    // 3. Check if accounts exist
    if (!fromUser) {
      return res.status(404).json({ message: "Sender account not found" });
    }
    if (!toUser) {
      return res.status(404).json({ message: "Receiver account not found" });
    }

    // 4. Check for sufficient balance (The core task)
    if (fromUser.balance < amount) {
      // This matches the "Insufficient balance" output
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // 5. Perform the transfer (Sequential, application-level logic)
    // As per the requirement, we do this without a DB transaction.
    fromUser.balance -= amount;
    toUser.balance += amount;

    // 6. Save both updated documents
    await fromUser.save();
    await toUser.save();

    // 7. Return the successful response
    // This matches the "Transferred $150..." output
    res.status(200).json({
      message: `Transferred $${amount} from ${fromUser.name} to ${toUser.name}`,
      senderBalance: fromUser.balance,
      receiverBalance: toUser.balance
    });

  } catch (error) {
    // Handle other errors (e.g., invalid Mongoose ObjectID format)
    res.status(500).json({ message: "An error occurred during the transfer", error: error.message });
  }
});

// --- 5. Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
