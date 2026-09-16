export type AttachmentKind = 'audio' | 'image';

export interface AttachmentMeta {
  id: string;
  kind: AttachmentKind;
  mimeType: string;
  size: number;
  durationMs?: number;
  width?: number;
  height?: number;
  createdAt: number;
}

export interface Notebook {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Section {
  id: string;
  notebookId: string | null;
  name: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Item {
  id: string;
  title: string;
  text: string;
  notebookId: string | null;
  sectionId: string;
  attachments: AttachmentMeta[];
  createdAt: number;
  updatedAt: number;
}

export interface StoredBlob {
  id: string;
  blob: Blob;
}

export type ItemKindFilter = 'audio' | 'image' | 'text';

export interface ItemFilter {
  sectionId?: string;
  notebookId?: string;
  q?: string;
  kinds?: ItemKindFilter[];
  from?: number;
  to?: number;
}

export interface NewItemInput {
  title?: string;
  text?: string;
  notebookId?: string | null;
  sectionId?: string;
  attachments?: AttachmentMeta[];
}

export const INBOX_ID = '__inbox__';
export const INBOX_NAME = '新灵感';

export const NOTEBOOK_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];
