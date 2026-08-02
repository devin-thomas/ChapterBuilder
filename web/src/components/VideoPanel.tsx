import { forwardRef } from 'react';
import { formatMilliseconds } from '../domain/timecode';
import { FolderIcon, VideoIcon } from './Icons';

interface VideoPanelProps {
  videoUrl: string;
  videoName: string;
  currentTimeMs: number;
  onOpenVideo: () => void;
  onTimeUpdate: (milliseconds: number) => void;
}

export const VideoPanel = forwardRef<HTMLVideoElement, VideoPanelProps>(function VideoPanel({ videoUrl, videoName, currentTimeMs, onOpenVideo, onTimeUpdate }, ref) {
  return (
    <section className="panel video-panel">
      <div className="panel__heading panel__heading--row"><span>Local video player</span><strong className="mono">{formatMilliseconds(currentTimeMs)}</strong></div>
      {videoUrl ? (
        <video ref={ref} src={videoUrl} controls preload="metadata" onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime * 1000)} />
      ) : (
        <button className="video-empty" onClick={onOpenVideo}>
          <VideoIcon />
          <strong>Choose a local tournament recording</strong>
          <span>Preview and capture timestamps without uploading the source video.</span>
          <em><FolderIcon />Open video file</em>
        </button>
      )}
      {videoName ? <p className="video-caption">Playing locally: {videoName}</p> : null}
    </section>
  );
});
