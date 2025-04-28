import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";

const CodeEditor = ({ socket, roomID }) => {
  const [code, setCode] = useState("// Start coding...");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("javascript");

  useEffect(() => {
    if (!socket) return;

    // Listen for code updates from other users
    socket.on("codeUpdate", ({ newCode, newLanguage }) => {
      setCode(newCode);
      setLanguage(newLanguage);
    });

    socket.on("codeOutput", (result) => {
      setOutput(result);
    });

    return () => {
      socket.off("codeUpdate");
      socket.off("codeOutput");
    };
  }, [socket]);

  // Emit code changes to other users
  const handleChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomID, code: newCode, language });
  };

  // Run code execution
  const runCode = async () => {
    console.log("🔹 Sending code to backend:", { code, language });
  
    socket.emit("runCode", { code, language });
  
    socket.on("codeOutput", (result) => {
      console.log("✅ Output received:", result);
      setOutput(result);
    });
  };
  
  

  return (
    <div style={{ border: "2px solid #333", borderRadius: "5px", padding: "10px" }}>
      <h3>Live Code Editor</h3>
      <select onChange={(e) => setLanguage(e.target.value)} value={language} style={{ marginBottom: "10px" }}>
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="java">Java</option>
        <option value="cpp">C++</option>
        <option value="c">C</option>
        <option value="php">PHP</option>
        <option value="ruby">Ruby</option>
        <option value="go">Go</option>
        <option value="rust">Rust</option>
      </select>
      <Editor height="400px" language={language} theme="vs-dark" value={code} onChange={handleChange} />
      <button onClick={runCode} style={{ marginTop: "10px" }}>Run Code</button>
      <h3>Output:</h3>
      <pre style={{ background: "#222", color: "#fff", padding: "10px" }}>{output}</pre>
    </div>
  );
};

export default CodeEditor;
