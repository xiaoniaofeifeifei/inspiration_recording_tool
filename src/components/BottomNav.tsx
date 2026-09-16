import { NavLink } from 'react-router-dom';
import { InboxIcon, ListIcon, MicIcon } from './icons';

function tabClass({ isActive }: { isActive: boolean }): string {
  return `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
    isActive ? 'text-brand-600' : 'text-slate-400'
  }`;
}

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <NavLink to="/" end className={tabClass}>
        <MicIcon className="h-5 w-5" />
        记录
      </NavLink>
      <NavLink to="/inbox" className={tabClass}>
        <InboxIcon className="h-5 w-5" />
        新灵感
      </NavLink>
      <NavLink to="/library" className={tabClass}>
        <ListIcon className="h-5 w-5" />
        全部
      </NavLink>
    </nav>
  );
}
