type Props = {
  title: string;
  subtitle: string;
};

export default function SummitPageHeader({ title, subtitle }: Props) {
  return (
    <header className="space-y-2">
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-stone-300">
        <span className="h-px w-7 bg-amber-300/80" />
        {subtitle}
      </p>
      <h1 className="text-4xl font-semibold leading-none text-white">{title}</h1>
    </header>
  );
}
