import { ItemList } from '../components/ItemList';
import { PageShell } from '../components/PageShell';
import { useItems } from '../lib/hooks';
import { INBOX_ID } from '../types';

export function InboxPage() {
  const items = useItems({ sectionId: INBOX_ID });

  return (
    <PageShell
      title="新灵感"
      subtitle="所有还没归类的灵感都先落在这里，想起来再整理。"
    >
      <ItemList
        items={items}
        showLocation
        empty="还没有灵感。回「记录」点一下录音，或者打一句话试试。"
      />
    </PageShell>
  );
}
