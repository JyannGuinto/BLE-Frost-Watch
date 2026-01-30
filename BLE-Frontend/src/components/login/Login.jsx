import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; 
import jentecLogo from "../../assets/jentec-storage-inc-logo.png"; 


export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth(); // <-- get setUser from context
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // allows cookie to be set
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // ✅ Update AuthContext with the logged-in user
      setUser(data.user);

      // ✅ Navigate to dashboard
      navigate("/");
    } catch (err) {
      setError("Network error. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center
      bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50
      dark:from-slate-900 dark:via-slate-800 dark:to-slate-900
      transition-all duration-500">

      <div className="bg-white/80 shadow-xl rounded-2xl p-10 w-full max-w-md backdrop-blur">

        {/* LOGO + NAME */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={jentecLogo}
            alt="Jentec Storage Inc."
            className="h-30 w-auto mb-3 drop-shadow-md"
          />
          
        </div>

        {/* Login Title */}
        <h1 className="text-2xl font-semibold text-slate-800 text-center mb-6">
          Login
        </h1>

        {error && (
          <div className="mb-4 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-slate-600 text-sm">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="mt-1 w-full p-2 rounded-lg border border-slate-300
              focus:outline-none focus:ring focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="text-slate-600 text-sm">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full p-2 rounded-lg border border-slate-300
              focus:outline-none focus:ring focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#2fc2e7] to-[#37abc8]
            text-white py-2 rounded font-medium hover:opacity-90 transition"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
