import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Sighthound Content Ops
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Internal editorial workflow dashboard
        </p>
        <p className="mt-4 text-sm text-slate-700">
          The system is deployed successfully and ready for operational use.
        </p>

        <nav className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/calendar"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open Calendar
          </Link>
          <Link
            href="/social-posts"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Social Posts
          </Link>
          <Link
            href="/blogs"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View Blogs
          </Link>
        </nav>
      </div>
    </main>
  );
}
