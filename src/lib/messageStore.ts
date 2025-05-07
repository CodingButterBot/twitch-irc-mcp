/**
 * @fileoverview In-memory storage for Twitch chat messages
 * Provides methods for storing, retrieving, and filtering chat messages
 * @author CodingButter
 */

import logger from '../utils/logger.js';

/**
 * Message interface representing a Twitch chat message
 * @interface Message
 * @property {string} id - Unique message ID
 * @property {string} channel - Channel the message was sent in
 * @property {string} username - Username of the sender
 * @property {string} message - Content of the message
 * @property {Date} timestamp - When the message was sent
 * @property {Object} tags - Additional metadata from Twitch IRC
 */
export interface Message {
  id: string;
  channel: string;
  username: string;
  message: string;
  timestamp: Date;
  tags: Record<string, string | boolean | null>;
}

/**
 * Filter options for retrieving messages
 * @interface MessageFilter
 * @property {string} [channel] - Optional channel to filter by
 * @property {string} [username] - Optional username to filter by
 * @property {string} [contains] - Optional message content to filter by
 * @property {Date} [since] - Optional start date for messages
 * @property {Date} [until] - Optional end date for messages
 * @property {number} [page] - Optional pagination page number (0-based)
 * @property {number} [pageSize] - Optional page size for pagination
 */
export interface MessageFilter {
  channel?: string;
  username?: string;
  contains?: string;
  since?: Date;
  until?: Date;
  page?: number;
  pageSize?: number;
}

/**
 * In-memory storage for Twitch chat messages
 * Provides efficient storage and retrieval with automatic pruning of old messages
 * @class MessageStore
 */
export class MessageStore {
  private messages: Map<string, Message[]>;
  private maxMessagesPerChannel: number;

  /**
   * Create a new MessageStore
   * @param maxMessagesPerChannel Maximum number of messages to store per channel
   */
  constructor(maxMessagesPerChannel = 1000) {
    this.messages = new Map();
    this.maxMessagesPerChannel = maxMessagesPerChannel;
  }

  /**
   * Add a message to the store
   * @param message The message to add
   */
  addMessage(message: Message): void {
    const channel = message.channel.toLowerCase();
    
    if (!this.messages.has(channel)) {
      this.messages.set(channel, []);
    }
    
    const channelMessages = this.messages.get(channel);
    if (channelMessages) {
      channelMessages.push(message);
      
      // Prune old messages if we've exceeded the limit
      if (channelMessages.length > this.maxMessagesPerChannel) {
        const excessCount = channelMessages.length - this.maxMessagesPerChannel;
        channelMessages.splice(0, excessCount);
        logger.debug(`Pruned ${excessCount} old messages from ${channel}`);
      }
    }
  }

  /**
   * Get recent messages from a channel
   * @param channel The channel name
   * @param limit Maximum number of messages to return
   * @returns Array of messages
   */
  getRecentMessages(channel: string, limit = 10): Message[] {
    const channelLower = channel.toLowerCase();
    const channelMessages = this.messages.get(channelLower) || [];
    
    return channelMessages
      .slice(-Math.min(limit, channelMessages.length))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get all messages for a channel
   * @param channel The channel name
   * @returns Array of all messages
   */
  getAllMessages(channel?: string): Message[] {
    if (channel) {
      const channelLower = channel.toLowerCase();
      return this.messages.get(channelLower) || [];
    }
    
    // Return all messages from all channels
    return Array.from(this.messages.values())
      .flat()
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Filter messages based on criteria
   * @param filter Filter options
   * @returns Filtered messages
   */
  filterMessages(filter: MessageFilter): Message[] {
    let messages = this.getAllMessages(filter.channel);
    
    // Apply username filter
    if (filter.username) {
      const userLower = filter.username.toLowerCase();
      messages = messages.filter(msg => msg.username.toLowerCase().includes(userLower));
    }
    
    // Apply content filter
    if (filter.contains) {
      const contentLower = filter.contains.toLowerCase();
      messages = messages.filter(msg => msg.message.toLowerCase().includes(contentLower));
    }
    
    // Apply time range filters
    if (filter.since) {
      messages = messages.filter(msg => filter.since ? msg.timestamp >= filter.since : true);
    }
    
    if (filter.until) {
      messages = messages.filter(msg => filter.until ? msg.timestamp <= filter.until : true);
    }
    
    // Sort by timestamp (oldest to newest)
    messages = messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Apply pagination if requested
    if (filter.page !== undefined && filter.pageSize !== undefined) {
      const page = filter.page < 0 ? 0 : filter.page;
      const pageSize = filter.pageSize <= 0 ? 10 : filter.pageSize;
      const start = page * pageSize;
      const end = start + pageSize;
      return messages.slice(start, end);
    }
    
    return messages;
  }

  /**
   * Clear all messages or messages from a specific channel
   * @param channel Optional channel to clear
   */
  clearMessages(channel?: string): void {
    if (channel) {
      const channelLower = channel.toLowerCase();
      this.messages.delete(channelLower);
      logger.info(`Cleared messages for channel ${channel}`);
    } else {
      this.messages.clear();
      logger.info('Cleared all messages from all channels');
    }
  }

  /**
   * Get the number of messages stored for a channel
   * @param channel The channel name
   * @returns Number of messages stored
   */
  getMessageCount(channel?: string): number {
    if (channel) {
      const channelLower = channel.toLowerCase();
      return this.messages.get(channelLower)?.length || 0;
    }
    
    return Array.from(this.messages.values()).reduce((count, msgs) => count + msgs.length, 0);
  }
}

// Export a singleton instance
export default new MessageStore();