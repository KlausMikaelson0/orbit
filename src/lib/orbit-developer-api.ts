import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateWebhookSecret() {
  return randomBytes(24).toString("hex");
}

export function hashWebhookSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function matchesWebhookSecret(
  providedSecret: string,
  storedSecretHash: string,
) {
  const providedHash = hashWebhookSecret(providedSecret);
  const providedBuffer = Buffer.from(providedHash, "utf8");
  const storedBuffer = Buffer.from(storedSecretHash, "utf8");

  if (providedBuffer.length !== storedBuffer.length) {
    return false;
  }
  return timingSafeEqual(providedBuffer, storedBuffer);
}

export function getOrbitRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    if (first) {
      return first.trim();
    }
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
