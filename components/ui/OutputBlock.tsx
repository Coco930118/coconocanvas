'use client';

import { CopyButton } from './CopyButton';

interface Props {
  text: string;
  platform?: 'x' | 'threads';
  /** Label shown above the block, outside the copyable area */
  label?: string;
  /** Extra note alongside the label (e.g. quality) */
  labelNote?: string;
  /** Override border/bg classes for the block container */
  blockClassName?: string;
  /** Override text classes */
  textClassName?: string;
  copyLabel?: string;
}

/**
 * A single self-contained copyable output block.
 * Character thoughts, quality labels, and character names are rendered
 * OUTSIDE this component so they are never included in clipboard text.
 */
export function OutputBlock({
  text,
  label,
  labelNote,
  blockClassName = 'bg-zinc-900/60 border border-zinc-800 rounded',
  textClassName = 'text-sm text-zinc-200 leading-loose font-sans',
  copyLabel,
}: Props) {
  return (
    <div>
      {(label || labelNote) && (
        <div className="flex items-center gap-2 mb-1.5 select-none">
          {label && <span className="text-xs text-zinc-500">{label}</span>}
          {labelNote && <span className="text-xs text-zinc-600">{labelNote}</span>}
        </div>
      )}
      <div className={`relative p-4 ${blockClassName}`}>
        <div className="absolute top-3 right-3">
          <CopyButton text={text} label={copyLabel} />
        </div>
        <pre className={`whitespace-pre-wrap pr-20 ${textClassName}`}>{text}</pre>
      </div>
    </div>
  );
}
