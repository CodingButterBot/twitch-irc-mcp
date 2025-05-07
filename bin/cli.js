#!/usr/bin/env node

// Import modules (ES Module syntax)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Print the sample MCP configuration
if (process.argv.includes("--print-config")) {
  const configPath = join(__dirname, "../mcp-sample.json");
  process.stdout.write(readFileSync(configPath, "utf8"));
  process.exit(0);
}

// Otherwise, run the application
import("../dist/index.js");
