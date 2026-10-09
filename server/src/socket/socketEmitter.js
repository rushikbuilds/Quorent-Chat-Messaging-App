const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-streams-adapter');
const { getRedisClient, isAvailable } = require('../config/redis');

let redisEmitter = null;
let localIo = null;

/**
 * Initialize the Redis Emitter using a dedicated Redis client.
 */
const initSocketEmitter = async (io = null) => {
  if (io) {
    localIo = io;
  }

  try {
    if (isAvailable()) {
      const emitterClient = await getRedisClient();
      if (emitterClient) {
        redisEmitter = new Server({
          adapter: createAdapter(emitterClient)
        });
        console.log('Socket.IO Redis Streams Emitter initialized successfully.');
      }
    }
  } catch (error) {
    console.warn('[socketEmitter] Could not initialize Redis Emitter, using local fallback:', error.message);
  }
};

/**
 * Set the local io instance for in-memory fallback.
 */
const setLocalIo = (io) => {
  localIo = io;
};

/**
 * Emit an event to all sockets in a specific chat room.
 * @param {string|number} chatId 
 * @param {string} event 
 * @param {any} data 
 */
const emitToChat = (chatId, event, data) => {
  const room = `chat_${chatId}`;
  if (redisEmitter) {
    try {
      redisEmitter.to(room).emit(event, data);
      return true;
    } catch (err) {
      console.error(`[socketEmitter] Redis emit to ${room} failed:`, err.message);
    }
  }

  if (localIo) {
    localIo.to(room).emit(event, data);
    return true;
  }

  console.warn(`[socketEmitter] Failed to emit '${event}' to ${room} - no active emitter or local io`);
  return false;
};

/**
 * Emit an event to all sockets for a specific user.
 * @param {string|number} userId 
 * @param {string} event 
 * @param {any} data 
 */
const emitToUser = (userId, event, data) => {
  const room = `user_${userId}`;
  if (redisEmitter) {
    try {
      redisEmitter.to(room).emit(event, data);
      return true;
    } catch (err) {
      console.error(`[socketEmitter] Redis emit to ${room} failed:`, err.message);
    }
  }

  if (localIo) {
    localIo.to(room).emit(event, data);
    return true;
  }

  console.warn(`[socketEmitter] Failed to emit '${event}' to ${room} - no active emitter or local io`);
  return false;
};

/**
 * Broadcast an event to all connected sockets.
 * @param {string} event 
 * @param {any} data 
 */
const emitToAll = (event, data) => {
  if (redisEmitter) {
    try {
      redisEmitter.emit(event, data);
      return true;
    } catch (err) {
      console.error(`[socketEmitter] Redis broadcast emit failed:`, err.message);
    }
  }

  if (localIo) {
    localIo.emit(event, data);
    return true;
  }

  return false;
};

module.exports = {
  initSocketEmitter,
  setLocalIo,
  emitToChat,
  emitToUser,
  emitToAll,
  getEmitter: () => redisEmitter || localIo
};
