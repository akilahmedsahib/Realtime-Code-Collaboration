import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";
import Login from "./pages/Login";        
import Signup from "./pages/Signup";     
import { SocketProvider } from "./socketContext";
import CodeEditor from "./components/CodeEditor";
import socket from "./socket";

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />    
          <Route path="/signup" element={<Signup />} />   
          <Route path="/room/:roomId" element={<Room />} />
          <Route
            path="/editor/:roomID"
            element={<CodeEditor socket={socket} roomID="1234" />}
          />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
