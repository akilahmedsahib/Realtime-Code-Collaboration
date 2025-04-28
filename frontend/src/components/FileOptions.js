import { useRef } from "react";

const FileOptions = ({ socket }) => {
  const fileInputRef = useRef(null);

  // Function to trigger file input
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  // Function to handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        socket.emit("file-upload", e.target.result); // Send file content to server
      };
      reader.readAsText(file);
    }
  };

  // Function to download current code
  const handleDownloadFile = () => {
    const code = "// Your current code will be fetched here"; // Replace with actual code state
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "code.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex items-center space-x-4">
      <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded" onClick={() => socket.emit("new-file")}>
        New File
      </button>

      <button className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded" onClick={handleDownloadFile}>
        Download File
      </button>

      <button className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded" onClick={handleUploadClick}>
        Upload File
      </button>

      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
    </div>
  );
};

export default FileOptions;
