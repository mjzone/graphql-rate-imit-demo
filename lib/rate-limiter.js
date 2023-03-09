"use strict";
const Redis = require("ioredis");
const { createRateLimitDirective, RedisStore } = require("graphql-rate-limit");

const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  },
};

const redisClient = new Redis(redisOptions);

const rateLimitOptions = {
  identifyContext: (ctx) => ctx?.request?.ipAddress || ctx?.id,
  formatError: ({ fieldName }) => `Too many requests for ${fieldName}!`,
  store: new RedisStore(redisClient),
};

const rateLimitDirective = createRateLimitDirective(rateLimitOptions);

module.exports = {
  rateLimitDirective,
};
