const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User'); // adjust path if needed
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const passwordHash = await bcrypt.hash('admin123', 10); // your desired password

    await User.updateOne(
      { username: 'admin' },
      { $set: { password: passwordHash } }
    );

    console.log('✅ Admin password updated');
    mongoose.disconnect();
  })
  .catch(console.error);
