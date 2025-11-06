import { useEffect, useState } from "react";
import { getBackendStatus, pingAPI } from "./services/api";

function App() {
  const [status, setStatus] = useState("");
  const [ping, setPing] = useState("");

  useEffect(() => {
    getBackendStatus().then(data => setStatus(data.message));
    pingAPI().then(data => setPing(data.message));
  }, []);

  return (
    <div style={{ fontFamily: "Arial", textAlign: "center", marginTop: "2rem" }}>
      <h1> Equalizer Project</h1>
      <h3>Backend says:</h3>
      <p>{status}</p>
      <h3>API Ping:</h3>
      <p>{ping}</p>
    </div>
  );
}

export default App;
