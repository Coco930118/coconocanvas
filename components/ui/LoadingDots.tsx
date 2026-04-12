'use client';

interface Props {
  message: string;
  color?: 'indigo' | 'amber';
}

export function LoadingDots({ message, color = 'indigo' }: Props) {
  const dotColor = color === 'amber' ? 'bg-amber-500' : 'bg-indigo-500';

  return (
    <div className="flex items-center gap-3 text-zinc-500 text-sm py-2">
      <div className="flex gap-1 items-center">
        {[0, 150, 300].map(delay => (
          <span
            key={delay}
            className={`w-1.5 h-1.5 ${dotColor} rounded-full animate-bounce`}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <span className="text-zinc-500">{message}</span>
    </div>
  );
}
