type Props = {
  title: string;
  body: string;
};

export default function SummitEmpty({ title, body }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-stone-300">{body}</p>
    </div>
  );
}
