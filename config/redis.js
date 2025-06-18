const redis = require('redis');

let redisClient = null;

const connectRedis = async () => {
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    console.log('⚠️ Redis not configured - caching disabled');
    return null;
  }
  
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
    });
    
    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
    
    await redisClient.connect();
    return redisClient;
    
  } catch (error) {
    console.log('⚠️ Redis connection failed - continuing without caching');
    return null;
  }
};

// Cache helper functions
const cache = {
  get: async (key) => {
    if (!redisClient) return null;
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },
  
  set: async (key, value, ttl = 3600) => {
    if (!redisClient) return false;
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },
  
  del: async (key) => {
    if (!redisClient) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },
  
  flush: async () => {
    if (!redisClient) return false;
    try {
      await redisClient.flushAll();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }
};

module.exports = {
  connectRedis,
  cache,
  redisClient: () => redisClient
};