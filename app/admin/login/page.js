"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Base64 encode token and store in localStorage
        const encryptedToken = btoa(data.token);
        localStorage.setItem("token", encryptedToken);

        // Redirect to dashboard
        router.push("/admin/dashboard");
      } else {
        setError(data.message || "Invalid email or password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4 py-12 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-lg shadow-indigo-600/30 mb-4">
            A
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Admin Portal
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
            Sign in with your administrative credentials to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none p-6 sm:p-8">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 p-4 text-sm text-red-600 dark:text-red-400 flex items-start gap-3">
              <span className="text-base font-bold">⚠️</span>
              <div className="flex-1">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-zinc-500 text-sm">
                  ✉️
                </div>
                <input
                  type="email"
                  required
                  placeholder="admin@test.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-zinc-500 text-sm">
                  🔒
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In to Dashboard &rarr;</span>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-zinc-600">
          Protected administrative area &bull; Authorized personnel only
        </p>
      </div>
    </div>
  );
}