/**
 * @fileoverview Twitch IRC client implementation using tmi.js
 * Provides connectivity to Twitch chat, message handling, and channel management
 * @author CodingButter
 */

import tmi from 'tmi.js';
import config from '../utils/config.js';
import logger from '../utils/logger.js';
import messageStore, { Message } from './messageStore.js';

/**
 * Options for creating a Twitch client
 * @interface TwitchClientOptions
 * @property {string} username - Twitch bot username
 * @property {string} oauthToken - OAuth token for authentication
 * @property {string[]} [channels] - Optional array of channels to join on startup
 * @property {boolean} [reconnect] - Whether to automatically attempt reconnection
 */
export interface TwitchClientOptions {
  username: string;
  oauthToken: string;
  channels?: string[];
  reconnect?: boolean;
}

/**
 * Class for interacting with Twitch chat
 * Handles connection management, channel operations, and message sending
 * @class TwitchClient
 */
export class TwitchClient {
  private client: tmi.Client;
  private channels: Set<string>;
  private connected: boolean;
  private reconnectAttempts: number;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectInterval = 5000; // 5 seconds

  /**
   * Create a new TwitchClient
   * @param {TwitchClientOptions} options - Client configuration options
   * @throws {Error} If required configuration is missing
   */
  constructor(options: TwitchClientOptions) {
    const { username, oauthToken, channels = [], reconnect = true } = options;

    this.channels = new Set(channels.map(channel => channel.toLowerCase()));
    this.connected = false;
    this.reconnectAttempts = 0;

    this.client = new tmi.Client({
      options: { debug: config.logging.level === 'debug' },
      connection: {
        reconnect,
        secure: true,
      },
      identity: {
        username,
        password: oauthToken,
      },
      channels: [...this.channels],
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for the Twitch client
   * Configures listeners for connection, chat, and channel events
   * @private
   */
  private setupEventHandlers(): void {
    // Connection events
    this.client.on('connecting', () => {
      logger.info('Connecting to Twitch IRC...');
    });

    this.client.on('connected', (_address, _port) => {
      logger.info(`Connected to Twitch IRC as ${config.twitch.username}`);
      this.connected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('disconnected', (reason) => {
      logger.warn(`Disconnected from Twitch IRC: ${reason}`);
      this.connected = false;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
          this.connect().catch(err => {
            logger.error(`Reconnect attempt failed: ${err.message}`);
          });
        }, this.reconnectInterval);
      } else {
        logger.error('Maximum reconnection attempts reached. Giving up.');
      }
    });

    // Chat events
    this.client.on('message', (channel, userstate, message, self) => {
      // Don't process messages from the bot itself
      if (self) return;
      
      // Store the message
      const msg: Message = {
        id: userstate.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        channel: channel.replace('#', ''),
        username: userstate['display-name'] || userstate.username || 'anonymous',
        message,
        timestamp: new Date(),
        tags: userstate,
      };
      
      messageStore.addMessage(msg);
      
      if (config.logging.level === 'debug') {
        logger.debug(`[${msg.channel}] ${msg.username}: ${msg.message}`);
      }
    });

    // Channel events
    this.client.on('join', (channel, username, self) => {
      if (self) {
        const channelName = channel.replace('#', '');
        this.channels.add(channelName);
        logger.info(`Joined channel: ${channelName}`);
      }
    });

    this.client.on('part', (channel, username, self) => {
      if (self) {
        const channelName = channel.replace('#', '');
        this.channels.delete(channelName);
        logger.info(`Left channel: ${channelName}`);
      }
    });

    // Error handling for reconnects
    this.client.on('reconnect', () => {
      logger.warn(`Twitch IRC reconnecting...`);
    });
    
    // Handle general client events
    this.client.on('disconnected', (reason) => {
      logger.error(`Twitch IRC disconnected: ${reason}`);
    });
  }

  /**
   * Connect to Twitch IRC
   * @returns {Promise<void>} A promise that resolves when successfully connected
   * @throws {Error} If connection fails
   */
  async connect(): Promise<void> {
    if (this.connected) {
      logger.info('Already connected to Twitch IRC');
      return;
    }

    try {
      await this.client.connect();
    } catch (error) {
      logger.error(`Failed to connect to Twitch IRC: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  /**
   * Disconnect from Twitch IRC
   * @returns {Promise<void>} A promise that resolves when successfully disconnected
   * @throws {Error} If disconnection fails
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      logger.info('Not connected to Twitch IRC');
      return;
    }

    try {
      await this.client.disconnect();
      this.connected = false;
      logger.info('Disconnected from Twitch IRC');
    } catch (error) {
      logger.error(`Failed to disconnect from Twitch IRC: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  /**
   * Join a Twitch channel
   * @param {string} channel - The channel to join (with or without # prefix)
   * @returns {Promise<void>} A promise that resolves when successfully joined
   * @throws {Error} If joining the channel fails
   */
  async joinChannel(channel: string): Promise<void> {
    const channelName = channel.toLowerCase().startsWith('#') ? channel : `#${channel}`;
    
    try {
      await this.client.join(channelName);
      logger.info(`Joined channel: ${channel}`);
    } catch (error) {
      logger.error(`Failed to join channel ${channel}: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  /**
   * Leave a Twitch channel
   * @param {string} channel - The channel to leave (with or without # prefix)
   * @returns {Promise<void>} A promise that resolves when successfully left
   * @throws {Error} If leaving the channel fails
   */
  async leaveChannel(channel: string): Promise<void> {
    const channelName = channel.toLowerCase().startsWith('#') ? channel : `#${channel}`;
    
    try {
      await this.client.part(channelName);
      logger.info(`Left channel: ${channel}`);
    } catch (error) {
      logger.error(`Failed to leave channel ${channel}: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  /**
   * Send a message to a Twitch channel
   * @param {string} channel - The channel to send the message to (with or without # prefix)
   * @param {string} message - The message text to send
   * @returns {Promise<void>} A promise that resolves when message is sent
   * @throws {Error} If not connected or if sending fails
   */
  async sendMessage(channel: string, message: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to Twitch IRC');
    }

    const channelName = channel.toLowerCase().startsWith('#') ? channel : `#${channel}`;
    
    try {
      await this.client.say(channelName, message);
      logger.debug(`Sent message to ${channel}: ${message}`);
    } catch (error) {
      logger.error(`Failed to send message to ${channel}: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  /**
   * Get the list of joined channels
   * @returns {string[]} Array of channel names (without # prefix)
   */
  getChannels(): string[] {
    return [...this.channels];
  }

  /**
   * Check if connected to Twitch IRC
   * @returns {boolean} True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// Create and export a singleton instance
const twitchClient = new TwitchClient({
  username: config.twitch.username,
  oauthToken: config.twitch.oauthToken,
  channels: config.twitch.channel ? [config.twitch.channel] : [],
});

export default twitchClient;