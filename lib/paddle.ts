import { Paddle, Environment } from "@paddle/paddle-node-sdk";

const isLiveKey = process.env.PADDLE_API_KEY?.includes("_live_");

export const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
  environment: isLiveKey ? Environment.production : Environment.sandbox,
});
