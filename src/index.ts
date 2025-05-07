/**
 * @fileoverview Main entry point for the Twitch IRC MCP application
 * @author CodingButter
 */

import { initCli } from './cli.js';
import { initMcpServer } from './lib/mcpServer.js';
import logger from './utils/logger.js';

/**
 * Main entry point for the application
 * Determines whether to run in HTTP mode or STDIO mode (default)
 * STDIO mode is the default for best compatibility with CLI usage and LLMs
 * @returns {Promise<void>} A promise that resolves when the application has started
 */
async function main(): Promise<void> {
  // Check run mode - default to STDIO mode for npx usage
  const isHttpMode = process.argv.includes('--http') || process.env.MCP_HTTP === 'true';
  
  // Set MCP mode environment variable for logger to detect
  if (!isHttpMode) {
    process.env.MCP_MODE = 'true';
  }
  
  try {
    if (isHttpMode) {
      // Start in HTTP mode if explicitly specified
      logger.info('Starting in HTTP mode');
      await initCli();
    } else {
      // Default to MCP STDIO mode for better npx compatibility
      // Use stderr for logs in MCP mode to avoid interfering with JSON-RPC on stdout
      process.stderr.write('[INFO] Starting in MCP STDIO mode\n');
      await initMcpServer();
    }
  } catch (error) {
    logger.error(`Application error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(`Fatal error: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});