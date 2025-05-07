/**
 * @fileoverview Configuration management for the application
 * Loads environment variables and provides typed configuration access
 * @author CodingButter
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration interface defining all application settings
 * @interface Config
 * @property {Object} twitch - Twitch connection settings
 * @property {string} twitch.username - Twitch bot username
 * @property {string} twitch.oauthToken - OAuth token for authentication
 * @property {string} twitch.channel - Default channel to join
 * @property {Object} server - Server configuration
 * @property {number} server.port - Port for HTTP server if enabled
 * @property {Object} logging - Logging configuration
 * @property {string} logging.level - Log level (error, warn, info, debug)
 */
export interface Config {
  twitch: {
    username: string;
    oauthToken: string;
    channel: string;
  };
  server: {
    port: number;
  };
  logging: {
    level: string;
  };
}

/**
 * Validate required environment variables
 * @private
 * @throws {Error} If any required environment variables are missing
 */
function validateConfig(): void {
  const requiredVars = ['TWITCH_USERNAME', 'TWITCH_OAUTH_TOKEN'];
  const missing = requiredVars.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Please check your .env file.`
    );
  }
}

/**
 * Get configuration from environment variables
 * @returns {Config} The application configuration object
 * @throws {Error} If required environment variables are missing
 */
export function getConfig(): Config {
  validateConfig();

  return {
    twitch: {
      username: process.env.TWITCH_USERNAME || '',
      oauthToken: process.env.TWITCH_OAUTH_TOKEN || '',
      channel: process.env.TWITCH_CHANNEL || '',
    },
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
  };
}

// Default export for easier importing
export default getConfig();