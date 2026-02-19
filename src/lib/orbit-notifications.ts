let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!audioContext) {
    audioContext = new window.AudioContext();
  }
  return audioContext;
}

export function playOrbitPingSound() {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(740, now);
  oscillator.frequency.exponentialRampToValueAtTime(920, now + 0.12);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1600, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.24);
}

export async function ensureNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export async function notifyOrbitMessage(title: string, body: string) {
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission || typeof window === "undefined") {
    return;
  }

  new Notification(title, {
    body,
    icon: "/favicon.ico",
    tag: "orbit-message",
  });
}
