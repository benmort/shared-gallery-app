import SummitNav from "@/components/summit/SummitNav";

type Props = {
  children: React.ReactNode;
};

export default function SummitShell({ children }: Props) {
  return (
    <div className="min-h-dvh bg-zinc-950 text-stone-100">
      <SummitNav />
      <main className="mx-auto w-full min-w-0 max-w-[1100px] break-words px-4 pb-[calc(6.75rem+var(--album-safe-bottom))] pt-5 sm:px-6 sm:pt-6">
        {children}
      </main>
    </div>
  );
}
