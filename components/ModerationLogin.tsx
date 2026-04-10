"use client";

import { useCallback, useState } from "react";

type Props = {
  onSuccess: () => void;
};

export default function ModerationLogin({ onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/auth/moderation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setError(data.error || "Could not sign in");
          return;
        }
        setPassword("");
        onSuccess();
      } catch {
        setError("Network error. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, password],
  );

  return (
    <div className="mx-auto mb-8 max-w-md rounded-xl border border-white/15 bg-white/5 px-4 py-6 text-center ring-1 ring-white/10">
      <h2 className="text-lg font-semibold text-stone-100">Moderation</h2>
      <p className="mt-2 text-sm text-stone-400">
        Enter the moderation password to review and remove items.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-4 flex flex-col gap-3">
        <label className="sr-only" htmlFor="mod-password">
          Password
        </label>
        <input
          id="mod-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400/80"
          placeholder="Password"
          required
        />
        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
