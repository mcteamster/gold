# Drinkin' Gold
## Aussie Pub Crawl Simulator - by mcteamster

## Architecture

Drinkin' Gold uses a serverless backend deployed on AWS via CDK.

### Backend (`service/`)

- **API Gateway WebSocket API** — handles `$connect`, `$disconnect`, and `$default` routes
- **Lambda functions** — `gold-connect`, `gold-disconnect`, `gold-message`, `gold-next-turn`
- **DynamoDB** — `gold-connections` (active WebSocket connections) and `gold-gamestate` (game state per room)
- **EventBridge Scheduler** — one-shot schedules (`gold-turns` group) drive the per-turn timer

Region: **ap-southeast-2**

### Frontend (`view/`)

React app (Vite). Connects to the API Gateway WebSocket endpoint.

## Deploy

Prerequisites:
- AWS CLI configured for the `mcteamster` account
- CDK bootstrapped in `ap-southeast-2`: `cdk bootstrap aws://ACCOUNT/ap-southeast-2`
- Node.js 20+

```bash
# Install dependencies
npm install

# Deploy the serverless stack
npm run deploy -w service

# Note the WebSocket endpoint from stack outputs, then update the frontend:
# REACT_APP_WSS_ENDPOINT=wss://<id>.execute-api.ap-southeast-2.amazonaws.com/prod
npm run build -w view
```

### WebSocket Endpoint

After `cdk deploy`, the endpoint URL is printed as the `GoldStack.WebSocketEndpoint` stack output.

Set `REACT_APP_WSS_ENDPOINT` in your build environment to point the frontend at the new endpoint.

## Development

```bash
# Start legacy controller (in-memory, local WebSocket server)
npm run start -w controller

# Run frontend dev server
npm run dev -w view
```
