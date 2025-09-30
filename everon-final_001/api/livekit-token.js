// LiveKit Token Generation API
// This generates access tokens for LiveKit room connections

import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { room, identity } = req.body;

    if (!room || !identity) {
      return res.status(400).json({ error: 'Room and identity are required' });
    }

    // Get LiveKit credentials from environment
    const livekitHost = process.env.VITE_LIVEKIT_WS_URL;
    const apiKey = process.env.VITE_LIVEKIT_API_KEY;
    const apiSecret = process.env.VITE_LIVEKIT_API_SECRET;

    if (!livekitHost || !apiKey || !apiSecret) {
      console.error('Missing LiveKit environment variables');
      return res.status(500).json({ error: 'LiveKit configuration missing' });
    }

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: identity,
      name: identity, // Display name
    });

    // Grant permissions for the room
    token.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate JWT token
    const jwt = token.toJwt();

    console.log(`Generated token for identity: ${identity}, room: ${room}`);

    return res.status(200).json({ 
      token: jwt,
      wsUrl: livekitHost,
      room: room,
      identity: identity
    });

  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate access token',
      details: error.message 
    });
  }
}