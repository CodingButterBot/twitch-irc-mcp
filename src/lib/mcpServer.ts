/**
 * @fileoverview MCP server implementation using the official SDK
 * This module initializes and configures the Model Context Protocol server
 * that provides Twitch chat functionality to LLMs
 * @author CodingButter
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import logger from '../utils/logger.js';
import twitchClient from './twitchClient.js';
import messageStore, { MessageFilter } from './messageStore.js';

/**
 * Initialize and configure the MCP server using the official ModelContextProtocol SDK
 * Sets up all tools with proper validation schemas and connects to Twitch
 * @returns {Promise<void>} A promise that resolves when the server is initialized
 * @throws {Error} If initialization fails
 */
export async function initMcpServer(): Promise<void> {
  try {
    // First, ensure we're connected to Twitch
    await twitchClient.connect();
    
    // Create MCP server using official SDK
    const server = new McpServer({
      name: 'TwitchIrcMcpServer',
      version: '1.0.0',
      description: 'MCP-compatible Twitch IRC server that provides tools for interacting with Twitch chat'
    });

    // Define schema for sendMessage tool
    server.tool('sendMessage', 
      { 
        channel: z.string().describe('The channel to send the message to'),
        text: z.string().describe('The message text to send')
      },
      async ({ channel, text }) => {
        try {
          await twitchClient.sendMessage(channel, text);
          return {
            content: [
              {
                type: 'text',
                text: `Message sent to channel #${channel}: "${text}"`
              }
            ]
          };
        } catch (error) {
          logger.error(`Error sending message: ${error instanceof Error ? error.message : error}`);
          return {
            content: [
              {
                type: 'text',
                text: `Error sending message: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Define schema for joinChannel tool
    server.tool('joinChannel', 
      {
        channel: z.string().describe('The channel to join')
      },
      async ({ channel }) => {
        try {
          await twitchClient.joinChannel(channel);
          return {
            content: [
              {
                type: 'text',
                text: `Joined channel #${channel}`
              }
            ]
          };
        } catch (error) {
          logger.error(`Error joining channel: ${error instanceof Error ? error.message : error}`);
          return {
            content: [
              {
                type: 'text',
                text: `Error joining channel: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Define schema for getRecentMessages tool
    server.tool('getRecentMessages', 
      {
        channel: z.string().describe('The channel to get messages from'),
        limit: z.number().optional().describe('Maximum number of messages to return (default: 10)')
      },
      async ({ channel, limit = 10 }) => {
        try {
          const messages = messageStore.getRecentMessages(channel, limit);
          
          if (messages.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No messages found in channel #${channel}`
                }
              ]
            };
          }
          
          const formattedMessages = messages.map(
            msg => `[${msg.timestamp.toISOString()}] ${msg.username}: ${msg.message}`
          );
          
          return {
            content: [
              {
                type: 'text',
                text: `Recent messages from #${channel}:\n${formattedMessages.join('\n')}`
              }
            ]
          };
        } catch (error) {
          logger.error(`Error getting recent messages: ${error instanceof Error ? error.message : error}`);
          return {
            content: [
              {
                type: 'text',
                text: `Error getting recent messages: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Define schema for filterMessages tool
    server.tool('filterMessages', 
      {
        channel: z.string().optional().describe('Filter by channel name'),
        username: z.string().optional().describe('Filter by username (partial match)'),
        contains: z.string().optional().describe('Filter by message content (partial match)'),
        since: z.string().optional().describe('Filter messages after this timestamp'),
        until: z.string().optional().describe('Filter messages before this timestamp'),
        page: z.number().optional().describe('Page number for pagination (0-based, default: 0)'),
        pageSize: z.number().optional().describe('Number of messages per page (default: 10)')
      },
      async ({ channel, username, contains, since, until, page, pageSize }) => {
        try {
          const filter: MessageFilter = {
            channel,
            username,
            contains,
            since: since ? new Date(since) : undefined,
            until: until ? new Date(until) : undefined,
            page,
            pageSize
          };
          
          const messages = messageStore.filterMessages(filter);
          
          if (messages.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No messages found matching the filter criteria'
                }
              ]
            };
          }
          
          const formattedMessages = messages.map(
            msg => `[${msg.timestamp.toISOString()}] #${msg.channel} ${msg.username}: ${msg.message}`
          );
          
          // Include pagination info if applicable
          let paginationInfo = '';
          if (page !== undefined && pageSize !== undefined) {
            paginationInfo = `\n\nPage ${page + 1}, showing ${messages.length} of ${messageStore.getMessageCount(channel)} messages`;
          }
          
          return {
            content: [
              {
                type: 'text',
                text: `Filtered messages:${channel ? ` (channel: #${channel})` : ''}\n${formattedMessages.join('\n')}${paginationInfo}`
              }
            ]
          };
        } catch (error) {
          logger.error(`Error filtering messages: ${error instanceof Error ? error.message : error}`);
          return {
            content: [
              {
                type: 'text',
                text: `Error filtering messages: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Define schema for getAllMessages tool
    server.tool('getAllMessages', 
      {
        channel: z.string().optional().describe('Optional channel to filter by')
      },
      async ({ channel }) => {
        try {
          const messages = messageStore.getAllMessages(channel);
          
          if (messages.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: channel 
                    ? `No messages found in channel #${channel}`
                    : 'No messages found in any channel'
                }
              ]
            };
          }
          
          const formattedMessages = messages.map(
            msg => `[${msg.timestamp.toISOString()}] #${msg.channel} ${msg.username}: ${msg.message}`
          );
          
          return {
            content: [
              {
                type: 'text',
                text: `All messages${channel ? ` from #${channel}` : ''}:\n${formattedMessages.join('\n')}`
              }
            ]
          };
        } catch (error) {
          logger.error(`Error getting all messages: ${error instanceof Error ? error.message : error}`);
          return {
            content: [
              {
                type: 'text',
                text: `Error getting all messages: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Define schema for getStatus tool
    server.tool('getStatus', 
      {},
      async () => {
        try {
          const isConnected = twitchClient.isConnected();
          const channels = twitchClient.getChannels();
          
          return {
            content: [
              {
                type: 'text',
                text: `Status: ${isConnected ? 'Connected' : 'Disconnected'}\nChannels: ${channels.length > 0 ? channels.map(c => `#${c}`).join(', ') : 'None'}`
              }
            ]
          };
        } catch (error) {
          logger.error(`Error getting status: ${error instanceof Error ? error.message : error}`);
          return {
            content: [
              {
                type: 'text',
                text: `Error getting status: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Log server start - use stderr to avoid interfering with JSON-RPC
    process.stderr.write('[INFO] Starting MCP server over STDIO...\n');

    // Start the server with stdio transport
    // The StdioServerTransport handles communication over stdin/stdout
    // which is perfect for integration with LLMs and other tools
    const transport = new StdioServerTransport();
    await server.connect(transport);

    process.stderr.write('[INFO] MCP server started with SDK\n');

    // Handle process exit
    process.on('SIGINT', async () => {
      process.stderr.write('[INFO] Received SIGINT, shutting down...\n');
      await twitchClient.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      process.stderr.write('[INFO] Received SIGTERM, shutting down...\n');
      await twitchClient.disconnect();
      process.exit(0);
    });

  } catch (error) {
    logger.error(`Failed to initialize MCP server: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}