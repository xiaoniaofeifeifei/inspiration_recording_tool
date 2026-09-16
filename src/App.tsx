import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { SaveCard } from './components/SaveCard';
import { ToastHost } from './components/ToastHost';
import { MoveDialogHost } from './components/MoveDialogHost';
import { HomePage } from './pages/HomePage';
import { InboxPage } from './pages/InboxPage';
import { LibraryPage } from './pages/LibraryPage';
import { NotebookPage } from './pages/NotebookPage';
import { ItemPage } from './pages/ItemPage';

export default function App() {
  const init = useStore((state) => state.init);
  const ready = useStore((state) => state.ready);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <main className="min-h-screen flex-1 pb-20 lg:pb-8">
        {ready ? (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/notebook/:notebookId" element={<NotebookPage />} />
            <Route path="/item/:itemId" element={<ItemPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        ) : (
          <div className="grid h-screen place-items-center text-sm text-slate-400">
            正在打开闪记…
          </div>
        )}
      </main>
      <BottomNav />
      <SaveCard />
      <MoveDialogHost />
      <ToastHost />
    </div>
  );
}
