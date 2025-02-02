import React, { useState } from 'react'
import './App.css'
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Navbar from './components/Navbar';
import { Divider } from '@mui/material';
import DashBoard from './components/DashBoard';
import VideoUpload from './components/videoUpload';



function App() {
  const [open,setOpen] = useState(false);
  return (
    <>  
      <Router>
        <div className="App">
          <Navbar open={open} setOpen={setOpen}/>
          <Divider/>
          <Routes>
            <Route path='/' element={<DashBoard/>}/>
            <Route path='/upload' element={<VideoUpload/>}/>
          </Routes>
        </div>
      </Router>
    </>
  )
}

export default App
