import React, { useEffect, useState } from "react";
import VideoCard from "./videoCard";
import axios from "axios";

const DashBoard = () => {
  const [videos, setVideos] = useState([]);
  useEffect(() => {
    try {
      axios.get(`http://localhost:5007/videos`).then((response) => {
        console.log(response);
        setVideos(response.data);
      });
    } catch (error) {
      console.log(error);
    }
  }, []);
 
  return (
    <div className="dashboard">
      VideoDashBoard
      {videos &&
        videos.map((video: any) => {
          return <VideoCard title={video.title} url={video.url} />;
        })}
    </div>
  );
};

export default DashBoard;
