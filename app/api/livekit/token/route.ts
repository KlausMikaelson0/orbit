import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const livekitApiKey = process.env.LIVEKIT_API_KEY;
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitApiKey || !livekitApiSecret) {
    return NextResponse.json(
      { error: "LiveKit API credentials are not configured." },
      { status: 500 },
    );
  }

  const requestUrl = new URL(request.url);
  const room = requestUrl.searchParams.get("room");
  const identity = requestUrl.searchParams.get("identity");
  const name = requestUrl.searchParams.get("name") ?? identity ?? "Orbit User";

  if (!room || !identity) {
    return NextResponse.json(
      { error: "Missing room or identity." },
      { status: 400 },
    );
  }

  const token = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity,
    name,
    ttl: "2h",
  });

  token.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return NextResponse.json({
    token: await token.toJwt(),
  });
}
