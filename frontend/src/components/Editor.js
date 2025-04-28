// Editor.jsx
import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import MonacoEditor from "@monaco-editor/react";
import axios from "axios";

const Editor = forwardRef((props, ref) => {
  const [code, setCode] = useState("// Write your code here...");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isExecuting, setIsExecuting] = useState(false);
  
  const editorInstanceRef = useRef(null);
  const iframeRef = useRef(null);
  const isLocalChangeRef = useRef(false);
  const decorationsRef = useRef([]);
  const monacoRef = useRef(null);
  
  const socket = props.socket;
  const roomId = props.roomId;

  const languages = {
    javascript: 63,
    python: 71,
    c: 50,
    cpp: 54,
    java: 62
  };

  // Expose methods to parent component through ref
  useImperativeHandle(ref, () => ({
    getValue: () => editorInstanceRef.current?.getValue() || "",
    setValue: (value) => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.setValue(value);
      }
    },
    getRoomId: () => roomId
  }));

  // Socket event handlers for code collaboration
  useEffect(() => {
    if (!socket || !roomId) return;
    
    // Request initial code state when joining a room
    socket.emit("get-initial-code", { roomId });
    
    // Handle code changes from other users
    const handleCodeChange = ({ code: newCode, userId }) => {
      if (userId === 'system' || userId !== socket.id) {
        isLocalChangeRef.current = true;
        if (editorInstanceRef.current) {
          const position = editorInstanceRef.current.getPosition();
          editorInstanceRef.current.setValue(newCode);
          editorInstanceRef.current.setPosition(position);
        }
        setCode(newCode);
      }
    };
    
    // Handle initial code when joining room
    const handleInitialCode = ({ code: initialCode, language: initialLanguage }) => {
      if (initialCode) {
        isLocalChangeRef.current = true;
        setCode(initialCode);
        if (editorInstanceRef.current) {
          editorInstanceRef.current.setValue(initialCode);
        }
      }
      
      if (initialLanguage) {
        setLanguage(initialLanguage);
      }
    };
    
    // Handle language changes from other users
    const handleLanguageChange = ({ language: newLanguage }) => {
      setLanguage(newLanguage);
    };
    
    // Handle cursor position updates from other users
    const handleCursorUpdate = (data) => {
      if (data.userId !== socket.id && editorInstanceRef.current) {
        updateRemoteCursor(data);
      }
    };
    
    // Register event listeners
    socket.on('code-change', handleCodeChange);
    socket.on('initial-code', handleInitialCode);
    socket.on('language-change', handleLanguageChange);
    socket.on('cursor-update', handleCursorUpdate);
    
    // Cleanup event listeners
    return () => {
      socket.off('code-change', handleCodeChange);
      socket.off('initial-code', handleInitialCode);
      socket.off('language-change', handleLanguageChange);
      socket.off('cursor-update', handleCursorUpdate);
    };
  }, [socket, roomId]);

  // Handle live preview for HTML/CSS
  useEffect(() => {
    if (["html", "css"].includes(language)) {
      updateLivePreview();
    }
  }, [code, language]);

  const updateLivePreview = () => {
    if (!iframeRef.current) return;
    
    const html = `
      <html>
        <head>
          <style>${language === "css" ? code : ""}</style>
        </head>
        <body>${language === "html" ? code : ""}</body>
      </html>`;
      
    iframeRef.current.srcdoc = html;
  };

  // Handle editor content changes
  const handleEditorChange = (newValue) => {
    setCode(newValue);
    
    // Only emit changes if they were made by the user (not received from server)
    if (!isLocalChangeRef.current && socket) {
      socket.emit("code-change", { code: newValue, roomId });
    }
    
    isLocalChangeRef.current = false;
  };

  // Handle language changes
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    
    if (socket) {
      socket.emit("language-change", { language: newLang, roomId });
    }
  };

  // Handle cursor position changes
  const handleCursorPositionChange = () => {
    if (!socket || !editorInstanceRef.current) return;
    
    const position = editorInstanceRef.current.getPosition();
    const selection = editorInstanceRef.current.getSelection();
    
    socket.emit("cursor-update", { 
      position, 
      selection, 
      roomId 
    });
  };

  // Run code function using Judge0 API
  const runCode = async () => {
    if (["html", "css"].includes(language)) return;
    
    setIsExecuting(true);
    setOutput("Running code...");
    
    try {
      const { data } = await axios.post("https://judge0-ce.p.rapidapi.com/submissions", {
        source_code: code,
        language_id: languages[language],
        stdin: ""
      }, {
        headers: {
          "X-RapidAPI-Key": "d6915d0f2emsha6752c36c811d2ep1adfbdjsna851c64946a5",
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        }
      });

      // Poll for result after 3 seconds
      setTimeout(async () => {
        try {
          const res = await axios.get(`https://judge0-ce.p.rapidapi.com/submissions/${data.token}`, {
            headers: {
              "X-RapidAPI-Key": "d6915d0f2emsha6752c36c811d2ep1adfbdjsna851c64946a5",
              "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            }
          });
          
          setOutput(res.data.stdout || res.data.stderr || "No Output");
          setIsExecuting(false);
        } catch (err) {
          setOutput(`Error retrieving results: ${err.message}`);
          setIsExecuting(false);
        }
      }, 3000);
    } catch (err) {
      setOutput(`Error executing code: ${err.message}`);
      setIsExecuting(false);
    }
  };

  // Update remote user cursors in editor
  const updateRemoteCursor = ({ userId, position, selection }) => {
    if (!editorInstanceRef.current || !monacoRef.current) return;
    
    const editor = editorInstanceRef.current;
    
    // Remove existing decorations for this user
    decorationsRef.current = decorationsRef.current.filter(d => d.userId !== userId);
    
    // Generate consistent color based on userId
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const color = `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
    
    // Create cursor decoration
    const decorations = [
      {
        range: new monacoRef.current.Range(
          position.lineNumber, 
          position.column, 
          position.lineNumber, 
          position.column + 1
        ),
        options: {
          className: `remote-cursor-${userId}`,
          hoverMessage: { value: `${userId}'s cursor` },
          zIndex: 100,
          beforeContentClassName: 'remote-cursor-before',
          after: {
            content: ' ',
            inlineClassName: `remote-cursor-after-${userId}`
          }
        }
      }
    ];
    
    // Add selection decoration if present
    if (selection && 
        (selection.startLineNumber !== selection.endLineNumber || 
         selection.startColumn !== selection.endColumn)) {
      decorations.push({
        range: new monacoRef.current.Range(
          selection.startLineNumber, 
          selection.startColumn, 
          selection.endLineNumber, 
          selection.endColumn
        ),
        options: {
          className: `remote-selection-${userId}`,
          inlineClassName: `remote-selection-inline-${userId}`
        }
      });
    }
    
    // Apply decorations to editor
    const ids = editor.deltaDecorations([], decorations.map(d => ({ 
      range: d.range, 
      options: d.options 
    })));
    
    // Store decoration IDs for removal later
    ids.forEach(id => decorationsRef.current.push({ 
      userId, 
      decorationId: id 
    }));
    
    // Add CSS for this user's cursor if not already present
    if (!document.getElementById(`style-${userId}`)) {
      const style = document.createElement("style");
      style.id = `style-${userId}`;
      style.innerHTML = `
        .remote-cursor-before-${userId} { border-left: 2px solid ${color}; height: 18px; }
        .remote-cursor-after-${userId} { background-color: ${color}; opacity: 0.5; }
        .remote-selection-inline-${userId} { background-color: ${color}; opacity: 0.2; }
      `;
      document.head.appendChild(style);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center bg-gray-800 text-white p-2 rounded">
        <div className={`h-3 w-3 rounded-full mr-2 ${socket?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span>Room: {roomId}</span>
      </div>

      <div className="flex gap-2 p-2">
        <button 
          onClick={runCode} 
          className={`${isExecuting ? 'bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'} text-white px-4 py-2 rounded transition`}
          disabled={isExecuting}
        >
          {isExecuting ? 'Running...' : 'Run Code'}
        </button>
        <select value={language} onChange={handleLanguageChange} className="ml-auto bg-gray-700 text-white px-3 py-1 rounded">
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="c">C</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
        </select>
      </div>

      <div className="flex-1">
        <MonacoEditor
          height="60vh"
          language={language}
          value={code}
          onChange={handleEditorChange}
          onMount={(editor, monaco) => {
            editorInstanceRef.current = editor;
            monacoRef.current = monaco;
            editor.onDidChangeCursorPosition(handleCursorPositionChange);
          }}
          theme="vs-dark"
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontFamily: 'monospace',
            fontSize: 14,
            tabSize: 2,
          }}
        />
      </div>

      <div className="bg-black text-white p-2 h-40 overflow-y-auto">
        <h3 className="text-sm font-bold">Output:</h3>
        <pre className="text-xs whitespace-pre-wrap">{output}</pre>
      </div>

      <iframe 
        ref={iframeRef} 
        title="Preview" 
        className="w-full h-40 border-t border-gray-700" 
        sandbox="allow-scripts"
      />
    </div>
  );
});

export default Editor;