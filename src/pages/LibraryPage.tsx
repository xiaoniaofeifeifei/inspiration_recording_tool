import { useState } from 'react';
import { ItemList } from '../components/ItemList';
import { PageShell } from '../components/PageShell';
import { SearchIcon } from '../components/icons';
import { useItems } from '../lib/hooks';
import type { ItemKindFilter } from '../types';

const KIND_OPTIONS: { value: ItemKindFilter | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'audio', label: '有录音' },
  { value: 'image', label: '有图片' },
  { value: 'text', label: '纯文字' },
];

const RANGE_OPTIONS = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]['value'];

function rangeStart(range: RangeValue): number | undefined {
  if (range === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  if (range === '7d') return Date.now() - 7 * 86_400_000;
  if (range === '30d') return Date.now() - 30 * 86_400_000;
  return undefined;
}

function chipClass(active: boolean): string {
  return `rounded-full px-3 py-1.5 text-xs transition ${
    active
      ? 'bg-brand-600 text-white'
      : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-200'
  }`;
}

export function LibraryPage() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<ItemKindFilter | 'all'>('all');
  const [range, setRange] = useState<RangeValue>('all');

  const items = useItems({
    q: query.trim() || undefined,
    kinds: kind === 'all' ? undefined : [kind],
    from: rangeStart(range),
  });

  return (
    <PageShell title="全部灵感" subtitle="按标题和正文搜索，随时把想法翻出来。">
      <div className="mb-4 space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题或正文…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {KIND_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={chipClass(kind === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={chipClass(range === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {items ? <p className="text-xs text-slate-400">找到 {items.length} 条灵感</p> : null}
      </div>

      <ItemList items={items} showLocation empty="没有匹配的灵感，换个关键词试试。" />
    </PageShell>
  );
}
