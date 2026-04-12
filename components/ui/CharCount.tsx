'use client';

interface Props {
  text: string;
  platform: 'x' | 'threads';
}

export function CharCount({ text, platform }: Props) {
  const count = text.length;

  if (platform === 'x') {
    return (
      <div className="flex gap-4 mt-2 text-xs text-zinc-700 select-none">
        <span className={count > 140 ? 'text-amber-500' : ''}>
          {count} / 140字
        </span>
        <span className={count > 500 ? 'text-red-500' : ''}>
          {count} / 500字
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 text-xs text-zinc-700 select-none">
      <span className={count > 500 ? 'text-amber-500' : ''}>{count} / 500字</span>
    </div>
  );
}
