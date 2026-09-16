import type { Item } from '../types';
import { ItemCard } from './ItemCard';

interface ItemListProps {
  items: Item[] | null;
  empty: string;
  showLocation?: boolean;
}

export function ItemList({ items, empty, showLocation = false }: ItemListProps) {
  if (!items) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-20 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-5 py-12 text-center text-sm text-slate-400">
        {empty}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} showLocation={showLocation} />
      ))}
    </div>
  );
}
