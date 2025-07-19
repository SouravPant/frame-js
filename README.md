# Ethos-Farcaster Frame

A Warpcast Frame backend to check Ethos scores and mutuals for Farcaster users.

## Features
- Input a Farcaster username or address
- Fetch and display Ethos score
- Show mutuals (followers & following intersection) and their Ethos scores
- Highlight the mutual with the highest score
- UI styled like Ethos Network

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```

## Usage
- Deploy `frame.js` to a serverless platform (Vercel, AWS Lambda, etc.) or run locally for development.
- Point your Warpcast Frame to the deployed endpoint.

## Configuration
- No API keys required for public Ethos and Farcaster endpoints (unless rate-limited).
- Customize UI in `frame.js` as needed.

## License
MIT 