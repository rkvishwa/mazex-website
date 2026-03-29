import Link from "next/link";

const adminIconPath =
  "M12 14V16C8.68629 16 6 18.6863 6 22H4C4 17.5817 7.58172 14 12 14ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13ZM12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11ZM14.5946 18.8115C14.5327 18.5511 14.5 18.2794 14.5 18C14.5 17.7207 14.5327 17.449 14.5945 17.1886L13.6029 16.6161L14.6029 14.884L15.5952 15.4569C15.9883 15.0851 16.4676 14.8034 17 14.6449V13.5H19V14.6449C19.5324 14.8034 20.0116 15.0851 20.4047 15.4569L21.3971 14.8839L22.3972 16.616L21.4055 17.1885C21.4673 17.449 21.5 17.7207 21.5 18C21.5 18.2793 21.4673 18.551 21.4055 18.8114L22.3972 19.3839L21.3972 21.116L20.4048 20.543C20.0117 20.9149 19.5325 21.1966 19.0001 21.355V22.5H17.0001V21.3551C16.4677 21.1967 15.9884 20.915 15.5953 20.5431L14.603 21.1161L13.6029 19.384L14.5946 18.8115ZM18 19.5C18.8284 19.5 19.5 18.8284 19.5 18C19.5 17.1716 18.8284 16.5 18 16.5C17.1716 16.5 16.5 17.1716 16.5 18C16.5 18.8284 17.1716 19.5 18 19.5Z";

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(107,82,143,0.18),transparent_32%),linear-gradient(180deg,#000102_0%,#020107_100%)] px-6 py-24">
      <div className="theme-card w-full max-w-md p-8 sm:p-10">
        <div className="space-y-3">
          <span className="theme-kicker">Access</span>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Sign in
          </h1>
          <p className="theme-copy text-sm">
            Participant sign-in is not connected yet, but the admin entry is ready.
          </p>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            className="theme-button theme-button-register flex-1 rounded-full px-6 py-3 text-sm font-semibold"
          >
            Sign In
          </button>
          <Link
            href="/login"
            aria-label="Admin login"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/16 bg-white/6 text-white shadow-[0_12px_32px_rgba(2,4,12,0.34)] backdrop-blur-xl transition hover:border-white/28 hover:bg-white/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d={adminIconPath} />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
