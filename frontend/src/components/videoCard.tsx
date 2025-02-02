import { Card, CardContent, CardMedia } from "@mui/material";
import React from "react";
import ReactPlayer from "react-player";
import Hls from "hls.js";

interface VideoCardProps {
  url: string;
  title: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ url, title }) => {
  const isHls = url.endsWith(".m3u8");

  return (
    <div className="card">
      <Card sx={{ minWidth: 275 }}>
        <CardMedia>
          {isHls ? (
            // Use a custom video player for HLS streams
            <video
              controls
              style={{ width: "100%" }}
              crossOrigin="anonymous"
              ref={(videoElement) => {
                if (videoElement && Hls.isSupported()) {
                  const hls = new Hls();
                  hls.loadSource(url);
                  hls.attachMedia(videoElement);
                }
              }}
            />
          ) : (
            // Use ReactPlayer for other video formats
            <ReactPlayer controls url={url} width="100%" height="100%" />
          )}
        </CardMedia>
        <CardContent>{title}</CardContent>
      </Card>
    </div>
  );
};

export default VideoCard;
