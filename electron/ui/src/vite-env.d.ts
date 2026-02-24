/// <reference types="vite/client" />

interface Window {
  electron?: {
    platform: string;
    isMac: boolean;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
  };
}
