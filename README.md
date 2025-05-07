# Twitch IRC MCP

An MCP-compatible Twitch chat integration tool for LLMs. This package provides Large Language Models with the ability to read and interact with Twitch chat via the [Model Context Protocol](https://modelcontextprotocol.ai).

## Recent Changes (v1.0.3)

- **Streamlined Architecture**: Eliminated redundant code layers for improved maintainability
- **Fixed MCP SyntaxError**: Resolved critical error when processing Twitch messages in MCP mode
- **Improved Logging**: Separated log output from JSON-RPC communication
- **Enhanced Stability**: Better compatibility with Claude and other LLMs

## Features

- **Easy Integration**: Works with Claude, ChatGPT, and other MCP-compatible LLMs
- **Simple Installation**: Just an `npx` command away
- **Twitch Chat Features**:
  - Send messages to Twitch channels
  - Read/retrieve recent messages
  - Filter chat by content, username, or timestamp
  - Join different channels
  - Track chat history

## Quick Start

### 1. Installation

No installation needed - uses npx to run directly!

For best results, add the example configuration to your `.mcp.json` file:

```bash
# Copy the example MCP configuration
npx twitch-irc-mcp --print-config >> .mcp.json
```

### 2. Configuration

Edit the `.mcp.json` file with your Twitch credentials:

```json
{
  "mcpServers": {
    "twitch-chat": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "twitch-irc-mcp"
      ],
      "env": {
        "TWITCH_USERNAME": "your_bot_username",
        "TWITCH_OAUTH_TOKEN": "xxxxxxxxxxxxxxxxxxxxxx",
        "TWITCH_CHANNEL": "defaultchannel"
      }
    }
  }
}
```

You can obtain an OAuth token from [Twitch Chat OAuth Password Generator](https://twitchapps.com/tmi/). The token can be used with or without the "oauth:" prefix - both formats work correctly.

### 3. Using with Claude or ChatGPT

The tool is now ready to use with any MCP-compatible language model. Simply start your LLM with the MCP configuration pointing to this tool.

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `sendMessage` | Send a message to a Twitch channel | `channel`: string, `text`: string |
| `joinChannel` | Join a new Twitch channel | `channel`: string |
| `getRecentMessages` | Get most recent chat messages | `channel`: string, `limit`: number (optional) |
| `filterMessages` | Filter chat by various criteria | `channel`: string (optional), `contains`: string (optional), `username`: string (optional), `since`: timestamp (optional), `until`: timestamp (optional), `page`: number (optional), `pageSize`: number (optional) |
| `getAllMessages` | Get all messages since startup | `channel`: string (optional) |
| `getStatus` | Check connection status | None |

## Direct Usage

To run directly:

```bash
# Using environment variables
TWITCH_USERNAME=your_bot_username \
TWITCH_OAUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxx \
TWITCH_CHANNEL=defaultchannel \
npx twitch-irc-mcp

# Using .env file (create this first)
npx twitch-irc-mcp
```

## Development

```bash
# Clone the repository
git clone https://github.com/CodingButter/twitch-irc-mcp.git
cd twitch-irc-mcp

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the package
npm run build
```

## License

MIT © CodingButter