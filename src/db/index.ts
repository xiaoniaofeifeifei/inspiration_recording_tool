import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import {
  INBOX_ID,
  NOTEBOOK_COLORS,
} from '../types';
import type {
  AttachmentMeta,
  Item,
  ItemFilter,
  ItemKindFilter,
  NewItemInput,
  Notebook,
  Section,
  StoredBlob,
} from '../types';
import { newId } from '../lib/id';

const DB_NAME = 'sparkling';
const DB_VERSION = 1;

interface SparklingDB extends DBSchema {
  notebooks: {
    key: string;
    value: Notebook;
    indexes: { 'by-sortOrder': number };
  };
  sections: {
    key: string;
    value: Section;
    indexes: { 'by-notebook': string };
  };
  items: {
    key: string;
    value: Item;
    indexes: { 'by-section': string; 'by-createdAt': number };
  };
  blobs: {
    key: string;
    value: StoredBlob;
  };
}

let dbPromise: Promise<IDBPDatabase<SparklingDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<SparklingDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SparklingDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const notebooks = db.createObjectStore('notebooks', { keyPath: 'id' });
        notebooks.createIndex('by-sortOrder', 'sortOrder');

        const sections = db.createObjectStore('sections', { keyPath: 'id' });
        sections.createIndex('by-notebook', 'notebookId');

        const items = db.createObjectStore('items', { keyPath: 'id' });
        items.createIndex('by-section', 'sectionId');
        items.createIndex('by-createdAt', 'createdAt');

        db.createObjectStore('blobs', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function closeDB(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}

/* ---------------------------------- 笔记本 --------------------------------- */

export async function listNotebooks(): Promise<Notebook[]> {
  const db = await getDB();
  const notebooks = await db.getAll('notebooks');
  return notebooks.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
}

export async function createNotebook(name: string, color?: string): Promise<Notebook> {
  const db = await getDB();
  const notebooks = await db.getAll('notebooks');
  const now = Date.now();
  const notebook: Notebook = {
    id: newId('nb'),
    name: name.trim() || '未命名笔记本',
    color: color ?? NOTEBOOK_COLORS[notebooks.length % NOTEBOOK_COLORS.length],
    sortOrder: notebooks.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.add('notebooks', notebook);
  return notebook;
}

export async function renameNotebook(id: string, name: string): Promise<void> {
  const db = await getDB();
  const notebook = await db.get('notebooks', id);
  if (!notebook) return;
  await db.put('notebooks', { ...notebook, name: name.trim() || notebook.name, updatedAt: Date.now() });
}

export async function deleteNotebook(id: string): Promise<void> {
  const db = await getDB();
  const sections = await db.getAllFromIndex('sections', 'by-notebook', id);
  for (const section of sections) {
    const items = await db.getAllFromIndex('items', 'by-section', section.id);
    await deleteItemsWithBlobs(items.map((item) => item.id));
  }
  const tx = db.transaction('sections', 'readwrite');
  for (const section of sections) {
    await tx.store.delete(section.id);
  }
  await tx.done;
  await db.delete('notebooks', id);
}

/* ----------------------------------- 分区 ---------------------------------- */

export async function listAllSections(): Promise<Section[]> {
  const db = await getDB();
  const sections = await db.getAll('sections');
  return sections.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
}

export async function listSections(notebookId: string): Promise<Section[]> {
  const db = await getDB();
  const sections = await db.getAllFromIndex('sections', 'by-notebook', notebookId);
  return sections.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
}

export async function createSection(notebookId: string, name: string): Promise<Section> {
  const db = await getDB();
  const siblings = await db.getAllFromIndex('sections', 'by-notebook', notebookId);
  const now = Date.now();
  const section: Section = {
    id: newId('sec'),
    notebookId,
    name: name.trim() || '新分区',
    sortOrder: siblings.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.add('sections', section);
  return section;
}

export async function renameSection(id: string, name: string): Promise<void> {
  const db = await getDB();
  const section = await db.get('sections', id);
  if (!section) return;
  await db.put('sections', { ...section, name: name.trim() || section.name, updatedAt: Date.now() });
}

export async function deleteSection(id: string): Promise<void> {
  const db = await getDB();
  const items = await db.getAllFromIndex('items', 'by-section', id);
  await deleteItemsWithBlobs(items.map((item) => item.id));
  await db.delete('sections', id);
}

/* ---------------------------------- 灵感 ---------------------------------- */

async function deleteItemsWithBlobs(itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(['items', 'blobs'], 'readwrite');
  const itemStore = tx.objectStore('items');
  const blobStore = tx.objectStore('blobs');
  for (const itemId of itemIds) {
    const item = await itemStore.get(itemId);
    if (!item) continue;
    for (const attachment of item.attachments) {
      await blobStore.delete(attachment.id);
    }
    await itemStore.delete(itemId);
  }
  await tx.done;
}

export async function saveItem(
  input: NewItemInput,
  blobs: StoredBlob[] = [],
): Promise<Item> {
  const db = await getDB();
  const now = Date.now();
  const sectionId = input.sectionId ?? INBOX_ID;
  const item: Item = {
    id: newId('item'),
    title: (input.title ?? '').trim(),
    text: input.text ?? '',
    notebookId: sectionId === INBOX_ID ? null : (input.notebookId ?? null),
    sectionId,
    attachments: input.attachments ?? [],
    createdAt: now,
    updatedAt: now,
  };
  const tx = db.transaction(['items', 'blobs'], 'readwrite');
  for (const blob of blobs) {
    await tx.objectStore('blobs').put(blob);
  }
  await tx.objectStore('items').put(item);
  await tx.done;
  return item;
}

export async function getItem(id: string): Promise<Item | null> {
  const db = await getDB();
  return (await db.get('items', id)) ?? null;
}

export async function updateItem(
  id: string,
  patch: Partial<Pick<Item, 'title' | 'text' | 'attachments' | 'notebookId' | 'sectionId'>>,
): Promise<Item | null> {
  const db = await getDB();
  const item = await db.get('items', id);
  if (!item) return null;
  const next: Item = { ...item, ...patch, updatedAt: Date.now() };
  if (next.sectionId === INBOX_ID) next.notebookId = null;
  await db.put('items', next);
  return next;
}

export async function moveItem(
  id: string,
  target: { notebookId: string | null; sectionId: string },
): Promise<Item | null> {
  return updateItem(id, {
    sectionId: target.sectionId,
    notebookId: target.sectionId === INBOX_ID ? null : target.notebookId,
  });
}

export async function deleteItem(id: string): Promise<void> {
  await deleteItemsWithBlobs([id]);
}

export async function addAttachments(
  itemId: string,
  attachments: { meta: AttachmentMeta; blob: Blob }[],
): Promise<Item | null> {
  const db = await getDB();
  const item = await db.get('items', itemId);
  if (!item) return null;
  const tx = db.transaction(['items', 'blobs'], 'readwrite');
  for (const attachment of attachments) {
    await tx.objectStore('blobs').put({ id: attachment.meta.id, blob: attachment.blob });
  }
  const next: Item = {
    ...item,
    attachments: [...item.attachments, ...attachments.map((attachment) => attachment.meta)],
    updatedAt: Date.now(),
  };
  await tx.objectStore('items').put(next);
  await tx.done;
  return next;
}

export async function removeAttachment(
  itemId: string,
  attachmentId: string,
): Promise<Item | null> {
  const db = await getDB();
  const item = await db.get('items', itemId);
  if (!item) return null;
  const tx = db.transaction(['items', 'blobs'], 'readwrite');
  await tx.objectStore('blobs').delete(attachmentId);
  const next: Item = {
    ...item,
    attachments: item.attachments.filter((attachment) => attachment.id !== attachmentId),
    updatedAt: Date.now(),
  };
  await tx.objectStore('items').put(next);
  await tx.done;
  return next;
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await getDB();
  const record = await db.get('blobs', id);
  return record?.blob ?? null;
}

function matchKind(item: Item, kind: ItemKindFilter): boolean {
  if (kind === 'audio') return item.attachments.some((attachment) => attachment.kind === 'audio');
  if (kind === 'image') return item.attachments.some((attachment) => attachment.kind === 'image');
  return item.attachments.length === 0;
}

export async function listItems(filter: ItemFilter = {}): Promise<Item[]> {
  const db = await getDB();
  let items = filter.sectionId
    ? await db.getAllFromIndex('items', 'by-section', filter.sectionId)
    : await db.getAll('items');

  if (filter.notebookId) {
    items = items.filter((item) => item.notebookId === filter.notebookId);
  }

  const query = filter.q?.trim().toLowerCase();
  if (query) {
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) || item.text.toLowerCase().includes(query),
    );
  }

  const kinds = filter.kinds;
  if (kinds && kinds.length > 0) {
    items = items.filter((item) => kinds.some((kind) => matchKind(item, kind)));
  }

  if (typeof filter.from === 'number') {
    items = items.filter((item) => item.createdAt >= filter.from!);
  }
  if (typeof filter.to === 'number') {
    items = items.filter((item) => item.createdAt <= filter.to!);
  }

  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function countItems(filter: ItemFilter = {}): Promise<number> {
  return (await listItems(filter)).length;
}
