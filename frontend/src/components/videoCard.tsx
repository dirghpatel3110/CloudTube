import { Card, CardContent, CardMedia, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface VideoCardProps {
  url: string;
  title: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ url, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [levels, setLevels] = useState<Array<{ 
    height: number; 
    width: number; 
    bitrate: number 
  }>>([]);
  const [currentQuality, setCurrentQuality] = useState<string>("auto");

  useEffect(() => {
    if (Hls.isSupported() && videoRef.current) {
      const hls = new Hls({
        autoStartLoad: true,
        capLevelToPlayerSize: false, // Disable automatic size adjustment
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels.map(level => ({
          height: level.height,
          width: level.width,
          bitrate: level.bitrate
        })));
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentQuality(`${hls.levels[data.level]?.height}p`);
      });

      return () => hls.destroy();
    }
  }, [url]);

  const handleQualityChange = (quality: string) => {
    if (!hlsRef.current) return;
    
    if (quality === "auto") {
      hlsRef.current.currentLevel = -1; // Enable auto-quality
    } else {
      const level = levels.findIndex(l => `${l.height}p` === quality);
      hlsRef.current.currentLevel = level;
    }
  };

  return (
    <Card sx={{ width: 800, height: 450 }}> {/* Fixed dimensions */}
      <CardMedia>
        <video
          ref={videoRef}
          controls
          style={{ 
            width: "100%", 
            height: "100%",
            objectFit: "contain" // Maintain aspect ratio
          }}
        />
        <FormControl sx={{ position: "absolute", top: 8, right: 8 }}>
          <Select
            value={currentQuality}
            onChange={(e) => handleQualityChange(e.target.value)}
            size="small"
          >
            <MenuItem value="auto">Auto ({currentQuality})</MenuItem>
            {levels.map((level, idx) => (
              <MenuItem key={idx} value={`${level.height}p`}>
                {level.height}p ({Math.round(level.bitrate/1000)}kbps)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </CardMedia>
      <CardContent>{title}</CardContent>
    </Card>
  );
};

export default VideoCard;
