import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaCode } from "react-icons/fa";

export default function HomePage() {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-800 to-pink-600 text-white overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 bg-gradient-to-br from-purple-900 to-indigo-500 animate-pulse"
      />
      <div className="relative z-10 text-center">
        <h1 className="text-5xl font-bold mb-4">Code together now on <span className="text-pink-400">CodeX</span></h1>
        <p className="text-lg">Your collaborative coding space, reimagined. Start now, no sign-up required.</p>
      </div>
      <div className="relative z-10 mt-8 flex gap-8">
        <div className="bg-gray-900 p-6 rounded-lg shadow-lg w-80">
          <h2 className="text-xl font-semibold mb-2">Create a Room</h2>
          <Input type="text" placeholder="Enter your name" className="mb-3" value={name} onChange={(e) => setName(e.target.value)} />
          <Button className="w-full bg-blue-500 hover:bg-blue-600">Create Room</Button>
        </div>
        <div className="bg-gray-900 p-6 rounded-lg shadow-lg w-80">
          <h2 className="text-xl font-semibold mb-2">Join a Room</h2>
          <Input type="text" placeholder="Room ID" className="mb-3" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          <Input type="text" placeholder="Enter your name" className="mb-3" value={name} onChange={(e) => setName(e.target.value)} />
          <Button className="w-full bg-green-500 hover:bg-green-600">Join Room</Button>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 text-sm text-gray-300">Server Online ✅</div>
    </div>
  );
}
