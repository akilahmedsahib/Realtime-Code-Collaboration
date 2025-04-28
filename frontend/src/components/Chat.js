import { useState, useEffect } from "react";
import io from "socket.io-client";
import { useParams } from "react-router-dom";
import ScrollToBottom from "react-scroll-to-bottom";

const socket = io("https://realtime-collaboration-backend.onrender.com");

function Chat() {
  const { roomId } = useParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.emit("join-room", roomId);

    socket.on("receive-message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive-message");
    };
  }, [roomId]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("send-message", { roomId, text: message });
      setMessages((prev) => [...prev, { text: message, self: true }]);
      setMessage("");
    }
  };

  return (
    <div className="w-1/3 p-4 border-l bg-gray-100">
      <h2 className="text-xl font-bold">Chat</h2>
      <ScrollToBottom className="h-64 overflow-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`p-2 my-1 ${msg.self ? "text-right" : "text-left"}`}>
            {msg.text}
          </div>
        ))}
      </ScrollToBottom>
      <div className="flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-grow p-2 border"
          placeholder="Type a message..."
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white p-2">Send</button>
      </div>
    </div>
  );
}

export default Chat;
