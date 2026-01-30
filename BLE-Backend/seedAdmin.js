// Run in Node.js or a separate script file
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User'); // adjust path

mongoose.connect('mongodb://localhost:27017/ble-monitoring') // adjust your DB
  .then(async () => {
    const passwordHash = await bcrypt.hash('admin123', 10);

    const adminUser = new User({
      username: 'admin',
      password: passwordHash,
      role: 'admin',
    });

    await adminUser.save();
    console.log('✅ Admin user created');
    mongoose.disconnect();
  })
  .catch(console.error);
