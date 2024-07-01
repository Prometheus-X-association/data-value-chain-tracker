const mongoose = require('mongoose');

const connectWithRetry = () => {
  console.log('MongoDB connection with retry');
  mongoose.connect('mongodb://localhost:27017/jsonldDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    console.log('MongoDB is connected');
  }).catch(err => {
    console.log('MongoDB connection unsuccessful, retry after 5 seconds. ', err);
    setTimeout(connectWithRetry, 5000);
  });
};

module.exports = connectWithRetry;
