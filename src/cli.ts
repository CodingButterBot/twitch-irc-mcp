/**
 * @fileoverview Command-line interface for Twitch IRC MCP
 * Provides CLI commands for interacting with Twitch chat
 * @author CodingButter
 */

import { Command } from 'commander';
import twitchClient from './lib/twitchClient.js';
import messageStore from './lib/messageStore.js';
import logger from './utils/logger.js';
import { initMcpServer } from './lib/mcpServer.js';

const program = new Command();

/**
 * Initialize the CLI with all available commands
 * Handles command-line argument parsing and execution
 * @returns {Promise<void>} A promise that resolves when CLI initialization is complete
 */
export async function initCli(): Promise<void> {
  program
    .name('twitch-cli')
    .description('Twitch IRC CLI and MCP Server')
    .version('1.0.0');

  // Start server command
  program
    .command('start')
    .description('Start the MCP server')
    .option('-s, --stdio', 'Run in STDIO mode for MCP')
    .option('-m, --mcp-only', 'Only start the MCP server, no HTTP server')
    .action(async (options) => {
      try {
        await twitchClient.connect();
        logger.info('Twitch IRC client connected');
        
        if (options.stdio) {
          // Start MCP server in STDIO mode
          await initMcpServer();
        } else {
          // TODO: Start HTTP server (to be implemented)
          logger.info('HTTP server mode not yet implemented');
          
          // For now, just keep the process alive
          logger.info('Press Ctrl+C to exit');
        }
      } catch (error) {
        logger.error(`Error starting server: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // Send message command
  program
    .command('send')
    .description('Send a message to a channel')
    .argument('<channel>', 'The channel to send the message to')
    .argument('<message>', 'The message to send')
    .action(async (channel, message) => {
      try {
        await twitchClient.connect();
        await twitchClient.sendMessage(channel, message);
        logger.info(`Message sent to #${channel}`);
        await twitchClient.disconnect();
      } catch (error) {
        logger.error(`Error sending message: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // Join channel command
  program
    .command('join')
    .description('Join a channel')
    .argument('<channel>', 'The channel to join')
    .action(async (channel) => {
      try {
        await twitchClient.connect();
        await twitchClient.joinChannel(channel);
        logger.info(`Joined channel #${channel}`);
        logger.info('Press Ctrl+C to exit');
        
        // Keep process alive to maintain connection
        process.on('SIGINT', async () => {
          await twitchClient.disconnect();
          process.exit(0);
        });
      } catch (error) {
        logger.error(`Error joining channel: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // Read recent messages command
  program
    .command('read')
    .description('Read recent messages from a channel')
    .argument('<channel>', 'The channel to read messages from')
    .option('-l, --limit <number>', 'Maximum number of messages to return', '10')
    .action(async (channel, options) => {
      try {
        await twitchClient.connect();
        
        // Need to join the channel first to receive messages
        await twitchClient.joinChannel(channel);
        logger.info(`Joined channel #${channel}`);
        
        // Wait a bit to allow messages to be received
        logger.info('Waiting for messages...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const limit = parseInt(options.limit, 10);
        const messages = messageStore.getRecentMessages(channel, limit);
        
        if (messages.length === 0) {
          console.log(`No messages found in channel #${channel}`);
        } else {
          console.log(`Recent messages from #${channel}:`);
          messages.forEach(msg => {
            console.log(`[${msg.timestamp.toISOString()}] ${msg.username}: ${msg.message}`);
          });
        }
        
        await twitchClient.disconnect();
      } catch (error) {
        logger.error(`Error reading messages: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // Filter messages command
  program
    .command('filter')
    .description('Filter messages based on criteria')
    .option('-c, --channel <channel>', 'Filter by channel name')
    .option('-u, --user <username>', 'Filter by username')
    .option('--contains <text>', 'Filter by message content')
    .option('--since <timestamp>', 'Filter messages after this timestamp')
    .option('--until <timestamp>', 'Filter messages before this timestamp')
    .option('-p, --page <number>', 'Page number (0-based)', '0')
    .option('-s, --pageSize <number>', 'Number of messages per page', '10')
    .action(async (options) => {
      try {
        await twitchClient.connect();
        
        if (options.channel) {
          // Need to join the channel first to receive messages
          await twitchClient.joinChannel(options.channel);
          logger.info(`Joined channel #${options.channel}`);
          
          // Wait a bit to allow messages to be received
          logger.info('Waiting for messages...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        const filter = {
          channel: options.channel,
          username: options.user,
          contains: options.contains,
          since: options.since ? new Date(options.since) : undefined,
          until: options.until ? new Date(options.until) : undefined,
          page: parseInt(options.page, 10),
          pageSize: parseInt(options.pageSize, 10),
        };
        
        const messages = messageStore.filterMessages(filter);
        
        if (messages.length === 0) {
          console.log('No messages found matching the filter criteria');
        } else {
          console.log('Filtered messages:');
          messages.forEach(msg => {
            console.log(`[${msg.timestamp.toISOString()}] #${msg.channel} ${msg.username}: ${msg.message}`);
          });
          
          const totalCount = messageStore.getMessageCount(options.channel);
          console.log(`\nPage ${filter.page + 1}, showing ${messages.length} of ${totalCount} messages`);
        }
        
        await twitchClient.disconnect();
      } catch (error) {
        logger.error(`Error filtering messages: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // Get all messages command
  program
    .command('all')
    .description('Get all messages since startup')
    .option('-c, --channel <channel>', 'Filter by channel name')
    .action(async (options) => {
      try {
        await twitchClient.connect();
        
        if (options.channel) {
          // Need to join the channel first to receive messages
          await twitchClient.joinChannel(options.channel);
          logger.info(`Joined channel #${options.channel}`);
          
          // Wait a bit to allow messages to be received
          logger.info('Waiting for messages...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        const messages = messageStore.getAllMessages(options.channel);
        
        if (messages.length === 0) {
          console.log(options.channel 
            ? `No messages found in channel #${options.channel}`
            : 'No messages found in any channel');
        } else {
          console.log(`All messages${options.channel ? ` from #${options.channel}` : ''}:`);
          messages.forEach(msg => {
            console.log(`[${msg.timestamp.toISOString()}] #${msg.channel} ${msg.username}: ${msg.message}`);
          });
        }
        
        await twitchClient.disconnect();
      } catch (error) {
        logger.error(`Error getting all messages: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // Status command
  program
    .command('status')
    .description('Get current connection status')
    .action(async () => {
      try {
        const isConnected = twitchClient.isConnected();
        if (!isConnected) {
          console.log('Status: Disconnected');
        } else {
          const channels = twitchClient.getChannels();
          console.log(`Status: Connected`);
          console.log(`Channels: ${channels.length > 0 ? channels.map(c => `#${c}`).join(', ') : 'None'}`);
        }
      } catch (error) {
        logger.error(`Error getting status: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // If no args, display help
  if (process.argv.length <= 2) {
    program.help();
  }

  // Parse command line args
  program.parse();
}