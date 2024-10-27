const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/jsonldDB";

const connectWithRetry = () => {
  console.log("MongoDB connection with retry");
  mongoose
    .connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    })
    .then(() => {
      console.log("MongoDB is connected");
    })
    .catch((err) => {
      console.log(
        "MongoDB connection unsuccessful, retry after 5 seconds. ",
        err,
      );
      setTimeout(connectWithRetry, 5000);
    });
};

module.exports = connectWithRetry;
