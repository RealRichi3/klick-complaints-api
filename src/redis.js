const redis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL;
const redisClient = new redis(REDIS_URL);

redisClient.on("connect", () => {
    console.log("Connected to Redis");
});

redisClient.on("error", (error) => {
    console.log("Error connecting to Redis", error);
    process.exit(1);
});

module.exports = redisClient;
