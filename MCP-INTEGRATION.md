# MCP Integration Guide

This document explains how to integrate the Twitch IRC MCP Server with MCP-compatible clients like Claude, LangChain, or other LLM tool platforms.

## What is MCP?

The Model Context Protocol (MCP) is a standardized interface for LLMs to interact with external tools and services. It provides a way for models to discover, call, and receive responses from these tools using a JSON-RPC based protocol.

## Integration Methods

The Twitch IRC MCP Server supports two integration methods:

1. **STDIO Mode**: For direct integration with LLMs using standard input/output.
2. **HTTP Mode**: For integrations that require an HTTP interface.

## STDIO Integration

STDIO integration is typically used when the LLM client can spawn a subprocess and communicate with it via standard input/output streams.

### Configuration

Add the following to your `.mcp.json` configuration file:

```json
{
  "mcpServers": {
    "twitch-chat": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "twitch-irc-mcp",
        "--stdio"
      ],
      "env": {
        "TWITCH_USERNAME": "your_bot_username",
        "TWITCH_OAUTH_TOKEN": "oauth:xxxxxxxxxxxxxxxxxxxxxx",
        "TWITCH_CHANNEL": "defaultchannel"
      }
    }
  }
}
```

### Environment Variables

- `TWITCH_USERNAME`: Your Twitch bot username
- `TWITCH_OAUTH_TOKEN`: OAuth token for your Twitch bot (obtain from [https://twitchapps.com/tmi/](https://twitchapps.com/tmi/))
- `TWITCH_CHANNEL`: Default channel to join on startup (optional)

## HTTP Integration

HTTP integration is useful for web-based clients or when you need to access the MCP server over a network.

### Configuration

Add the following to your `.mcp.json` configuration file:

```json
{
  "mcpServers": {
    "twitch-chat-http": {
      "type": "http",
      "url": "http://localhost:3000/mcp/call",
      "manifestUrl": "http://localhost:3000/mcp/manifest",
      "command": "npx",
      "args": [
        "-y",
        "twitch-irc-mcp",
        "--http"
      ],
      "env": {
        "TWITCH_USERNAME": "your_bot_username",
        "TWITCH_OAUTH_TOKEN": "oauth:xxxxxxxxxxxxxxxxxxxxxx",
        "TWITCH_CHANNEL": "defaultchannel",
        "PORT": "3000"
      }
    }
  }
}
```

### Environment Variables

- `TWITCH_USERNAME`: Your Twitch bot username
- `TWITCH_OAUTH_TOKEN`: OAuth token for your Twitch bot (obtain from [https://twitchapps.com/tmi/](https://twitchapps.com/tmi/))
- `TWITCH_CHANNEL`: Default channel to join on startup (optional)
- `PORT`: Port to run the HTTP server on (defaults to 3000)

## Available Tools

The Twitch IRC MCP Server provides the following tools:

1. `sendMessage`: Send a message to a Twitch channel
2. `joinChannel`: Join a new Twitch channel
3. `getRecentMessages`: Get recent messages from a channel
4. `filterMessages`: Filter chat messages by various criteria
5. `getAllMessages`: Get all messages since the server started
6. `getStatus`: Get current connection status and channels

## Manual Operation

You can also run the server manually without MCP integration:

```bash
# Start in STDIO mode
npx twitch-irc-mcp --stdio

# Start in HTTP mode
npx twitch-irc-mcp --http
```

## Troubleshooting

If you encounter issues with the MCP integration:

1. Ensure your Twitch credentials are correct
2. Check that the port specified is available (for HTTP mode)
3. Make sure your MCP client is properly configured to spawn the server
4. Verify that the environment variables are correctly set

For more detailed logs, set the `LOG_LEVEL` environment variable to `debug`.

## Example Usage

Once integrated with an MCP-compatible LLM, you can use the Twitch IRC MCP Server as follows:

```
# Send a message to a channel
twitch-chat.sendMessage({ channel: "channelname", text: "Hello from the LLM!" })

# Join a new channel
twitch-chat.joinChannel({ channel: "channelname" })

# Get recent messages
twitch-chat.getRecentMessages({ channel: "channelname", limit: 10 })
```

The exact syntax may vary depending on your MCP client implementation.