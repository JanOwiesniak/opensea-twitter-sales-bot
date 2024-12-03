# OpenSea Sales Twitter Bot

The OpenSea Sales Twitter Bot is an automated tool designed to monitor NFT sales for a specified collection on OpenSea and post updates to Twitter. This bot is built using Node.js and integrates with both the Twitter and OpenSea APIs.

## Table of Contents
- [Features](#features)
- [Requirements](#requirements)
- [Setup](#setup)
- [Redis Setup](#redis-setup)
- [Authentication with Twitter](#authentication-with-twitter)
- [Run the Bot](#run-the-bot)
- [Debugging](#debugging)
- [Customization](#customization)
- [Environment Variables](#environment-variables)
- [Authentication Flow](#authentication-flow)
- [Deployment](#deployment)
- [CLI Arguments](#cli-arguments)
- [License](#license)

## Features

- **Real-time Monitoring**: Tracks NFT sales events in real-time using the OpenSea API.
- **Automated Tweeting**: Posts sales updates to Twitter, including details like NFT name, price, and a link to the asset.
- **Configurable**: Easily customize which collections to track and the content of tweets.

## Requirements

- **Twitter Developer Account**: Necessary for API access and posting tweets.
- **Node.js**: Ensure Node.js is installed on your system.
- **Heroku Account**: Optional for deployment, but recommended for ease of use.

## Setup

Follow these steps to set up the bot:

1. **Clone the Repository**: Clone this project to your local machine or preferred Git hosting service.

2. **Twitter Developer Setup**:
   - Create a Twitter Developer App with read/write permissions.
   - Generate the consumer key and consumer secret.

3. **Environment Configuration**:
   - Development: Copy the `.env.sample` file to `.env` file in the root directory and add the following variables:
     ```
     CLIENT_ID=<Your Twitter Client ID>
     CLIENT_SECRET=<Your Twitter Client Secret>
     OPEN_SEA_API_KEY=<Your OpenSea API Key>
     COLLECTION_SLUG=<OpenSea Collection Slug>
     INFURA_PROJECT_ID=<Your Infura Project ID>
     AUTH_SERVER_PORT=<Auth Server AUTH_SERVER_PORT> (optional, default: 3000)
     REDIS_URL=<Your Redis connection string>
     ```
   - Production: Set the required environment variables in your Heroku app settings.

4. **Install Dependencies**:
   ```bash
   npm install
   ```

5. **Redis Setup**:
   - Install Redis on your local machine if you haven't already. You can download it from [Redis.io](https://redis.io/download).
   - Start the Redis server by running `redis-server` in your terminal.
   - Ensure the `REDIS_URL` is set in your `.env` file:
     ```
     REDIS_URL=redis://localhost:6379
     ```
   - For production, configure your Redis instance and update the `REDIS_URL` accordingly.

6. **Authentication with Twitter**:
    I highly recommend getting the access token and refresh token locally:
   - Start redis server with `redis-server`
   - Start tunnel to auth server with `ngrok http http://localhost:3000`
   - Update `CALLBACK_URL` in your `.env` file e.g. `https://<ngrok>/callback`
   - Set same callback URL in your Twitter Developer settings for your app e.g. `https://<ngrok>/callback`
   - Start auth flow with `./bin/cli --auth`
   - Open the auth link created by the auth server with your browser and follow the Twitter auth flow (this will trigger the `callback` endpoint, extract a one time code and exchange it for an user access token and refresh token which will be stored in your `.env` file)
   - Auth server shuts down once authentication is complete
   - Access token will be used to make requests to Twitter API with user context
   - Refresh token will be used to refresh access token if needed

7. **Run the Bot**:
   - Start redis server with `redis-server`
   - Start main process with `node app.js`
   - This will listen to OpenSea events and tweet sales updates

8. **Debugging**:
   - Test if access token is valid with `./bin/cli --check-token`
   - If not: Refresh token with `./bin/cli --refresh-token`
   - If it's still not valid: Start auth flow with `./bin/cli --auth`

## Customization

- **Tweet Content**: Modify the tweet format in `tweet.js` to include additional information from the OpenSea Events API.
- **Sales Threshold**: Implement logic in `app.js` to tweet only sales above a certain value.

## Environment Variables

- **CLIENT_ID** and **CLIENT_SECRET**: Obtain these from your Twitter Developer App dashboard.
- **CALLBACK_URL**: Set this to the URL provided by `ngrok` or your production domain. Ensure it matches the URL in your Twitter Developer settings.
- **OPEN_SEA_API_KEY**: Obtain from the OpenSea API dashboard.
- **INFURA_PROJECT_ID**: Obtain from the Infura dashboard.
- **ACCESS_TOKEN**: Will be set by the auth flow (`./bin/cli --auth`). Expose them as environment variables on your Heroku app.
- **REFRESH_TOKEN**: Will be set by the auth flow (`./bin/cli --auth`). Expose them as environment variables on your Heroku app.

## Authentication Flow

- **Why Use `ngrok`**: `ngrok` creates a secure URL to your local server, allowing Twitter to redirect back to your app during the OAuth flow.
- **Callback URL**: This URL is where Twitter will send the authorization code after user authentication.

## CLI Arguments

The bot can be controlled using various command-line arguments:

- `--auth`: Initiates the authentication flow with Twitter. Use this to obtain access and refresh tokens.
- `--tweet "Your tweet text"`: Sends a tweet with the specified text.
- `--check-token`: Checks the validity of the current access token.
- `--refresh-token`: Refreshes the access token using the refresh token.

These commands are executed via the `./bin/cli` script.

## Deployment

- If deploying to Heroku (or any other cloud provider), ensure you set up environment variables from the `.env` file in their dashboard.
- **Access and Refresh Tokens**: These will be set by the auth flow (`./bin/cli --auth`). Expose them as environment variables on your Heroku app.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
