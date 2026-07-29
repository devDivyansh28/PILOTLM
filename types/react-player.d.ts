declare module "react-player" {
  import React from "react";

  interface ReactPlayerProps {
    url?: string;
    src?: string;
    width?: string | number;
    height?: string | number;
    controls?: boolean;
    playing?: boolean;
    loop?: boolean;
    muted?: boolean;
    volume?: number;
    playbackRate?: number;
    onReady?: () => void;
    onStart?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onError?: (error: Error) => void;
    config?: Record<string, unknown>;
    className?: string;
    style?: React.CSSProperties;
    wrapper?: string | React.ComponentType<{ children: React.ReactNode }>;
    ref?: React.Ref<ReactPlayer>;
  }

  class ReactPlayer extends React.Component<ReactPlayerProps> {
    seekTo(amount: number, type?: "seconds" | "fraction"): void;
    getCurrentTime(): number;
    getDuration(): number;
    getInternalPlayer(): Record<string, unknown>;
    showPreview(): void;
  }

  export default ReactPlayer;
}
