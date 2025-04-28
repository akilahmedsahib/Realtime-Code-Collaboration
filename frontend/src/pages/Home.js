import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidV4 } from "uuid";
import socket from "../socket";
import "../styles/index.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Home = () => {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [roomname, setRoomName] = useState("");
  const [popupMessage, setPopupMessage] = useState(null);
  const [popupType, setPopupType] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check authentication and load saved user data on component mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    // Load user's name if previously saved
    const savedName = localStorage.getItem("userName");
    if (savedName) {
      setName(savedName);
    }

    // Load last room ID if available
    const savedRoomId = localStorage.getItem("currentRoomId");
    if (savedRoomId) {
      setRoomId(savedRoomId);
    }
  }, [navigate]);

  const showPopup = (message, type) => {
    setPopupMessage(message);
    setPopupType(type);
    setTimeout(() => setPopupMessage(null), 3000);
  };

  const joinRoom = () => {
    if (!roomId.trim() || !name.trim()) {
      showPopup("Please enter your name and Room ID.", "error");
      return;
    }

    // Save user info for persistence
    localStorage.setItem("userName", name);
    localStorage.setItem("currentRoomId", roomId);
    setLoading(true);

    // First, check if the room exists
    fetch(`${API_BASE_URL}/api/check-room/${roomId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error("Server error while checking room");
        }
        return res.json();
      })
      .then(data => {
        if (data.exists) {
          // If room exists, proceed with join request
          if (data.roomname) {
            localStorage.setItem("roomName", data.roomname);
          }
          
          return fetch(`${API_BASE_URL}/api/request-join-room`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
              roomId,
              name,
              token: localStorage.getItem("token")
            }),
          });
        } else {
          throw new Error("Room not found. Check the Room ID and try again.");
        }
      })
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Room not found");
          } else {
            throw new Error("Error joining room");
          }
        }
        return res.json();
      })
      .then(data => {
        console.log("Join response:", data);
        
        if (data.success) {
          if (data.requiresApproval) {
            showPopup("Request sent to room host. Waiting for approval...", "success");

            // Listen for approval/rejection
            socket.once("join-approved", () => {
              navigate(`/room/${roomId}`, {
                state: { name, fromHome: true }
              });
            });
            
            socket.once("join-rejected", (rejectData) => {
              showPopup(rejectData.message || "Your request was rejected by the host", "error");
            });
          } else {
            // No approval needed, join directly
            showPopup("Joining room...", "success");
            setTimeout(() => {
              navigate(`/room/${roomId}`, {
                state: { name, fromHome: true }
              });
            }, 1000);
          }
        } else {
          throw new Error(data.message || "Error joining room");
        }
      })
      .catch(err => {
        console.error("Error joining room:", err);
        showPopup(err.message || "Error joining room. Please try again.", "error");
      })
      .finally(() => setLoading(false));
  };

  const createRoom = () => {
    if (!name.trim()) {
      showPopup("Please enter your name to create a room.", "error");
      return;
    }

    if (!roomname.trim()) {
      showPopup("Please enter a room name.", "error");
      return;
    }

    const newRoomId = uuidV4();
    setLoading(true);

    fetch(`${API_BASE_URL}/api/create-room`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        roomId: newRoomId,
        roomname,
        creator: name
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error("Room creation failed");
        return res.json();
      })
      .then(data => {
        if (data.success) {
          // Save all relevant information
          localStorage.setItem("userName", name);
          localStorage.setItem("currentRoomId", newRoomId);
          localStorage.setItem("roomName", roomname);
          
          showPopup("Room successfully created!", "success");
          
          // After a brief delay to show the success message, navigate to the room
          setTimeout(() => {
            navigate(`/room/${newRoomId}`, { 
              state: { 
                roomname, 
                name,
                isHost: true 
              }
            });
          }, 1000);
        } else {
          showPopup("Error creating room. Please try again.", "error");
        }
      })
      .catch(err => {
        console.error("Error creating room:", err);
        showPopup("Error creating room. Please try again.", "error");
      })
      .finally(() => setLoading(false));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <>
      <div className="animated-grainy-bg" />
      <button
        onClick={handleLogout}
        className="z-20 absolute top-6 right-6 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold"
      >
        Logout
      </button>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-white">
        <h1 className="text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-yellow-400 text-center">
          Realtime Code Collaboration
        </h1>
        <p className="mb-6 text-lg opacity-80 text-center max-w-xl">
          Collaborate, code, and build together in real-time.
        </p>

        <div className="w-full max-w-md mx-auto text-center rounded-2xl p-8 border border-white/20 bg-white/10 backdrop-blur-xl shadow-xl shadow-white/10">
          <input
            type="text"
            placeholder="Enter Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-lg mb-4 text-white border border-white/20 bg-white/10 backdrop-blur-md placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <div className="border-t border-white/10 my-4 pt-4">
            <h3 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
              Create New Room
            </h3>
            <input
              type="text"
              placeholder="Enter Room Name"
              value={roomname}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full p-3 rounded-lg mb-4 text-white border border-white/20 bg-white/10 backdrop-blur-md placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <button
              onClick={createRoom}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg mb-4 font-bold transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creating Room..." : "+ Create Room"}
            </button>
          </div>

          <div className="border-t border-white/10 my-4 pt-4">
            <h3 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-teal-400">
              Join Existing Room
            </h3>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full p-3 rounded-lg mb-4 text-white border border-white/20 bg-white/10 backdrop-blur-md placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400"
            />

            <button
              onClick={joinRoom}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-bold transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Joining..." : "→ Join Room"}
            </button>
          </div>
        </div>

        {popupMessage && (
          <div
            className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg text-white backdrop-blur-md ${popupType === "success" ? "bg-green-500/80" : "bg-red-500/80"}`}
          >
            {popupMessage}
          </div>
        )}
      </div>
    </>
  );
};

export default Home;