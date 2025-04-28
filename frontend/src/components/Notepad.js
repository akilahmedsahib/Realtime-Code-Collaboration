import React, { useState, useEffect, useRef } from "react";

const Notepad = ({ socket, roomId }) => {
  const [note, setNote] = useState("");
  const isLocalChangeRef = useRef(false);
  
  useEffect(() => {
    if (!socket || !roomId) return;
    
    // Handle note changes from other users
    const handleNoteChange = ({ text, userId }) => {
      if (userId !== socket.id) {
        isLocalChangeRef.current = true;
        setNote(text);
      }
    };
    
    // Get initial notes when joining room
    socket.emit("get-notes", { roomId });
    
    socket.on('note-change', handleNoteChange);
    socket.on('initial-notes', ({ text }) => {
      isLocalChangeRef.current = true;
      setNote(text);
    });
    
    return () => {
      socket.off('note-change', handleNoteChange);
      socket.off('initial-notes');
    };
  }, [socket, roomId]);
  
  const handleNoteChange = (e) => {
    const newText = e.target.value;
    setNote(newText);
    
    // Only emit changes if they were made by the user (not received from server)
    if (!isLocalChangeRef.current && socket) {
      socket.emit("note-change", { text: newText, roomId });
    }
    
    isLocalChangeRef.current = false;
  };
  
  return (
    <div className="h-full bg-gray-800 text-white p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-2">📓 Shared Notepad</h2>
      <textarea
        className="w-full h-80 bg-gray-900 text-white p-2 rounded-lg focus:outline-none"
        value={note}
        onChange={handleNoteChange}
        placeholder="Write your notes here..."
      />
      <p className="text-xs text-gray-400 mt-2">
        All notes are shared in real-time with room members
      </p>
    </div>
  );
};

export default Notepad;