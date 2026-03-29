"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Footer from "@/components/Footer";
import HexBackground from "@/components/HexBackground";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <Navbar />
      <main className="site-shell">
        <div aria-hidden="true" className="site-background">
          <div className="site-background-glow site-background-glow-primary" />
          <div className="site-background-glow site-background-glow-secondary" />
          <div className="site-background-glow site-background-glow-tertiary" />
          <HexBackground opacity={0.18} />
        </div>

        <section className="theme-section relative min-h-screen overflow-hidden pt-24 pb-12 sm:pt-32 sm:pb-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(129,140,248,0.08),transparent_30%)]" />

          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-11rem)] w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center justify-center py-8 sm:py-10">
              <div className="w-full max-w-md rounded-2xl border border-[#221a31] bg-[#08060f] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:p-9">
                <div className="space-y-3">
                  <span className="theme-chip text-[11px] font-bold uppercase tracking-[0.28em]">
                    Admin Login
                  </span>
                  <h2 className="text-3xl font-semibold tracking-tight text-[#F8FAFC]">
                    Welcome back
                  </h2>
                  <p className="theme-copy text-sm">
                    Enter your credentials to continue into the MazeX dashboard.
                  </p>
                </div>

                <form className="mt-8 space-y-6">
                  <div className="space-y-3">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-[#E2E8F0]"
                    >
                      Email address
                    </label>
                    <div className="flex h-[52px] items-center gap-3 rounded-xl border border-[#2a223a] bg-[#060813] px-4 shadow-[inset_0_1px_0_rgba(248,250,252,0.02)] transition focus-within:border-[#8a73a6] focus-within:shadow-[0_0_0_3px_rgba(107,82,143,0.18)]">
                      <Mail className="h-5 w-5 shrink-0 text-[#8a73a6]" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="user@knurdz.org"
                        className="h-full w-full border-0 bg-transparent text-sm text-[#F8FAFC] outline-none placeholder:text-[#64748B]"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-[#E2E8F0]"
                    >
                      Password
                    </label>
                    <div className="flex h-[52px] items-center gap-3 rounded-xl border border-[#2a223a] bg-[#060813] px-4 shadow-[inset_0_1px_0_rgba(248,250,252,0.02)] transition focus-within:border-[#8a73a6] focus-within:shadow-[0_0_0_3px_rgba(107,82,143,0.18)]">
                      <LockKeyhole className="h-5 w-5 shrink-0 text-[#8a73a6]" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className="h-full w-full border-0 bg-transparent text-sm text-[#F8FAFC] outline-none placeholder:text-[#64748B]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#8a73a6] transition hover:bg-white/5 hover:text-white"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4.5 w-4.5" />
                        ) : (
                          <Eye className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="theme-button theme-button-register w-full cursor-pointer rounded-full px-6 py-3.5 text-sm font-semibold"
                  >
                    Sign In
                  </button>
                </form>
                </div>
              </div>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}
