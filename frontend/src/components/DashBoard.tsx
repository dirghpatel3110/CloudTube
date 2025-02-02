import React, { useEffect, useState } from "react";
import VideoCard from "./videoCard";
import axios from "axios";

interface Video {
  _id: string; // Assuming MongoDB ObjectId is used
  title: string;
  url: string;
}

const DashBoard: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get("http://localhost:5007/videos");
        console.log(response.data);
        setVideos(response.data);
      } catch (err) {
        console.error("Error fetching videos:", err);
        setError("Failed to load videos. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return <div>Loading videos...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dashboard">
      <h1>Video Dashboard</h1>
      {videos.length > 0 ? (
        videos.map((video) => (
          <VideoCard key={video._id} title={video.title} url={video.url} />
        ))
      ) : (
        <p>No videos available.</p>
      )}
    </div>
  );
};

export default DashBoard;
