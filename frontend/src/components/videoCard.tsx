import { Card, CardContent, CardMedia } from "@mui/material";
import React from "react";
import ReactPlayer from "react-player";
interface VideoCardProps {
  url: string;
  title: string;
}
const videoCard: React.FC<VideoCardProps> = ({ url, title }) => {
  return (
    <div className="card">
      <Card sx={{ minWidth: 275 }}>
        <CardMedia>
          <ReactPlayer controls url={url} />
        </CardMedia>
        <CardContent>{title}</CardContent>
      </Card>
    </div>
  );
};

export default videoCard;
