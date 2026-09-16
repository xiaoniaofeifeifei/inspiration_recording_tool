import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addAttachments,
  closeDB,
  createNotebook,
  createSection,
  deleteNotebook,
  deleteSection,
  getBlob,
  getItem,
  listItems,
  listNotebooks,
  listSections,
  moveItem,
  removeAttachment,
  renameSection,
  saveItem,
  updateItem,
} from './index';
import { INBOX_ID } from '../types';
import type { AttachmentMeta } from '../types';

async function resetDatabase(): Promise<void> {
  await closeDB();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('sparkling');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function audioMeta(id: string): AttachmentMeta {
  return {
    id,
    kind: 'audio',
    mimeType: 'audio/webm',
    size: 3,
    durationMs: 4200,
    createdAt: Date.now(),
  };
}

beforeEach(async () => {
  await resetDatabase();
});

describe('笔记本与分区', () => {
  it('按创建顺序返回，并记录分区归属', async () => {
    const first = await createNotebook('第一首歌');
    const second = await createNotebook('第二首歌');
    await createSection(first.id, '分区 1');
    await createSection(first.id, '分区 2');
    await createSection(second.id, '分区 1');

    const notebooks = await listNotebooks();
    expect(notebooks.map((notebook) => notebook.name)).toEqual(['第一首歌', '第二首歌']);
    expect(notebooks[0].color).toMatch(/^#/);

    const firstSections = await listSections(first.id);
    expect(firstSections.map((section) => section.name)).toEqual(['分区 1', '分区 2']);
    expect(firstSections[0].notebookId).toBe(first.id);
  });

  it('重命名分区后能读到新名字', async () => {
    const notebook = await createNotebook('第一首歌');
    const section = await createSection(notebook.id, '分区 1');
    await renameSection(section.id, '副歌');
    const sections = await listSections(notebook.id);
    expect(sections[0].name).toBe('副歌');
  });

  it('删除笔记本会级联清掉分区、灵感和附件二进制', async () => {
    const notebook = await createNotebook('第一首歌');
    const section = await createSection(notebook.id, '分区 1');
    const item = await saveItem(
      { text: '副歌想法', sectionId: section.id, notebookId: notebook.id, attachments: [audioMeta('att_1')] },
      [{ id: 'att_1', blob: new Blob(['abc']) }],
    );

    expect(await getBlob('att_1')).not.toBeNull();

    await deleteNotebook(notebook.id);

    expect(await getItem(item.id)).toBeNull();
    expect(await getBlob('att_1')).toBeNull();
    expect(await listSections(notebook.id)).toHaveLength(0);
    expect(await listNotebooks()).toHaveLength(0);
  });

  it('删除分区只影响这个分区里的灵感', async () => {
    const notebook = await createNotebook('第一首歌');
    const keep = await createSection(notebook.id, '分区 1');
    const drop = await createSection(notebook.id, '分区 2');
    const keptItem = await saveItem({ text: '保留', sectionId: keep.id, notebookId: notebook.id });
    const droppedItem = await saveItem({ text: '删除', sectionId: drop.id, notebookId: notebook.id });

    await deleteSection(drop.id);

    expect(await getItem(keptItem.id)).not.toBeNull();
    expect(await getItem(droppedItem.id)).toBeNull();
  });
});

describe('灵感的归类', () => {
  it('新灵感默认落进「新灵感」收件箱', async () => {
    const item = await saveItem({ text: '随手哼的一句' });
    expect(item.sectionId).toBe(INBOX_ID);
    expect(item.notebookId).toBeNull();
    expect((await listItems({ sectionId: INBOX_ID })).map((entry) => entry.id)).toEqual([item.id]);
  });

  it('moveItem 会把灵感移进目标分区，并离开收件箱', async () => {
    const notebook = await createNotebook('第一首歌');
    const section = await createSection(notebook.id, '分区 1');
    const item = await saveItem({ text: '一段旋律' });

    const moved = await moveItem(item.id, { notebookId: notebook.id, sectionId: section.id });

    expect(moved?.sectionId).toBe(section.id);
    expect(moved?.notebookId).toBe(notebook.id);
    expect(await listItems({ sectionId: INBOX_ID })).toHaveLength(0);
    expect(await listItems({ notebookId: notebook.id })).toHaveLength(1);
  });

  it('把灵感移回收件箱会清掉 notebookId', async () => {
    const notebook = await createNotebook('第一首歌');
    const section = await createSection(notebook.id, '分区 1');
    const item = await saveItem({ text: '一段旋律', sectionId: section.id, notebookId: notebook.id });

    const moved = await moveItem(item.id, { notebookId: notebook.id, sectionId: INBOX_ID });

    expect(moved?.sectionId).toBe(INBOX_ID);
    expect(moved?.notebookId).toBeNull();
  });
});

describe('检索', () => {
  it('支持关键词、类型和时间筛选', async () => {
    const audioItem = await saveItem(
      { title: '副歌', text: '啦啦啦', attachments: [audioMeta('att_audio')] },
      [{ id: 'att_audio', blob: new Blob(['abc']) }],
    );
    const textItem = await saveItem({ text: '一个和弦走向' });

    expect((await listItems({ q: '和弦' })).map((item) => item.id)).toEqual([textItem.id]);
    expect((await listItems({ q: '副歌' })).map((item) => item.id)).toEqual([audioItem.id]);
    expect((await listItems({ kinds: ['audio'] })).map((item) => item.id)).toEqual([audioItem.id]);
    expect((await listItems({ kinds: ['text'] })).map((item) => item.id)).toEqual([textItem.id]);
    expect(await listItems({ from: Date.now() + 60_000 })).toHaveLength(0);
    expect(await listItems({ from: Date.now() - 60_000 })).toHaveLength(2);
  });

  it('列表按创建时间倒序', async () => {
    const first = await saveItem({ text: '先记的' });
    const second = await saveItem({ text: '后记的' });
    const items = await listItems();
    expect(items.map((item) => item.id)).toEqual([second.id, first.id]);
  });
});

describe('附件', () => {
  it('追加和删除附件会同步维护 blob', async () => {
    const item = await saveItem({ text: '一条灵感' });

    const withAudio = await addAttachments(item.id, [
      { meta: audioMeta('att_1'), blob: new Blob(['abc']) },
    ]);
    expect(withAudio?.attachments).toHaveLength(1);
    expect(await getBlob('att_1')).not.toBeNull();

    const removed = await removeAttachment(item.id, 'att_1');
    expect(removed?.attachments).toHaveLength(0);
    expect(await getBlob('att_1')).toBeNull();
  });

  it('更新文本会刷新 updatedAt', async () => {
    const item = await saveItem({ text: '初稿' });
    const updated = await updateItem(item.id, { text: '改过的第二稿' });
    expect(updated?.text).toBe('改过的第二稿');
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(item.updatedAt);
    expect((await getItem(item.id))?.text).toBe('改过的第二稿');
  });
});
