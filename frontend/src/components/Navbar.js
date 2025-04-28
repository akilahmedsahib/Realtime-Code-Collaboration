import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto">
        <Link to="/" className="text-lg font-bold">Real-Time Collaboration</Link>
      </div>
    </nav>
  );
}

export default Navbar;
