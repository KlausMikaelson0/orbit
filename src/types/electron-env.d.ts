export {};

declare global {
  interface Window {
    orbitDesktop?: {
      isElectron: boolean;
      platform: string;
      electronVersion: string;
    };
  }
}
