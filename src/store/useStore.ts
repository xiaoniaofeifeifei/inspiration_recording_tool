import { create } from 'zustand';
import {
  createNotebook,
  createSection,
  listAllSections,
  listItems,
  listNotebooks,
  moveItem,
  saveItem,
} from '../db';
import { ensureSeedData } from '../db/seed';
import { defaultTarget, describeTarget } from '../lib/labels';
import type { Target } from '../lib/labels';
import { newId } from '../lib/id';
import { INBOX_ID } from '../types';
import type { AttachmentMeta, Notebook, Section, StoredBlob } from '../types';

export interface DraftAttachment {
  meta: AttachmentMeta;
  blob: Blob;
}

export interface Draft {
  title: string;
  text: string;
  attachments: DraftAttachment[];
}

export interface ToastState {
  id: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface StoreState {
  ready: boolean;
  initializing: boolean;
  version: number;
  notebooks: Notebook[];
  sections: Section[];
  inboxCount: number;
  draft: Draft | null;
  target: Target;
  saving: boolean;
  toast: ToastState | null;
  moveItemId: string | null;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  bumpVersion: () => void;

  startDraft: (input: Partial<Draft>) => void;
  setDraftTitle: (title: string) => void;
  setDraftText: (text: string) => void;
  addDraftAttachments: (attachments: DraftAttachment[]) => void;
  removeDraftAttachment: (attachmentId: string) => void;
  setTarget: (target: Target) => void;
  commitDraft: () => Promise<void>;

  showToast: (toast: Omit<ToastState, 'id'>) => void;
  dismissToast: () => void;
  openMoveDialog: (itemId: string) => void;
  closeMoveDialog: () => void;
  moveItemTo: (itemId: string, target: Target) => Promise<void>;

  createNotebookWithSection: (name: string) => Promise<Section>;
  createSectionInNotebook: (notebookId: string, name: string) => Promise<Section>;
}

const emptyDraft: Draft = { title: '', text: '', attachments: [] };

export const useStore = create<StoreState>((set, get) => ({
  ready: false,
  initializing: false,
  version: 0,
  notebooks: [],
  sections: [],
  inboxCount: 0,
  draft: null,
  target: defaultTarget(),
  saving: false,
  toast: null,
  moveItemId: null,

  init: async () => {
    if (get().ready || get().initializing) return;
    set({ initializing: true });
    try {
      await ensureSeedData();
      await get().refresh();
    } finally {
      set({ ready: true, initializing: false });
    }
  },

  refresh: async () => {
    const [notebooks, sections] = await Promise.all([listNotebooks(), listAllSections()]);
    set({ notebooks, sections, inboxCount: await countInbox() });
  },

  bumpVersion: () => set((state) => ({ version: state.version + 1 })),

  startDraft: (input) => {
    set({
      draft: { ...emptyDraft, ...input, attachments: input.attachments ?? [] },
      target: defaultTarget(),
    });
  },

  setDraftTitle: (title) =>
    set((state) => (state.draft ? { draft: { ...state.draft, title } } : {})),

  setDraftText: (text) => set((state) => (state.draft ? { draft: { ...state.draft, text } } : {})),

  addDraftAttachments: (attachments) =>
    set((state) =>
      state.draft
        ? { draft: { ...state.draft, attachments: [...state.draft.attachments, ...attachments] } }
        : {},
    ),

  removeDraftAttachment: (attachmentId) =>
    set((state) =>
      state.draft
        ? {
            draft: {
              ...state.draft,
              attachments: state.draft.attachments.filter((item) => item.meta.id !== attachmentId),
            },
          }
        : {},
    ),

  setTarget: (target) => set({ target }),

  commitDraft: async () => {
    const { draft, target, saving } = get();
    if (!draft || saving) return;

    const hasContent =
      draft.text.trim().length > 0 || draft.title.trim().length > 0 || draft.attachments.length > 0;

    if (!hasContent) {
      set({ draft: null, target: defaultTarget() });
      return;
    }

    set({ saving: true });
    try {
      const blobs: StoredBlob[] = draft.attachments.map((attachment) => ({
        id: attachment.meta.id,
        blob: attachment.blob,
      }));

      const item = await saveItem(
        {
          title: draft.title,
          text: draft.text,
          sectionId: target.sectionId,
          notebookId: target.notebookId,
          attachments: draft.attachments.map((attachment) => attachment.meta),
        },
        blobs,
      );

      set({ draft: null, target: defaultTarget() });
      await get().refresh();
      get().bumpVersion();

      const label = describeTarget(target, get().notebooks, get().sections);
      get().showToast({
        text: `已存到 ${label}`,
        actionLabel: '更改',
        onAction: () => get().openMoveDialog(item.id),
      });
    } finally {
      set({ saving: false });
    }
  },

  showToast: (toast) => set({ toast: { ...toast, id: newId('toast') } }),
  dismissToast: () => set({ toast: null }),
  openMoveDialog: (itemId) => set({ moveItemId: itemId }),
  closeMoveDialog: () => set({ moveItemId: null }),

  moveItemTo: async (itemId, target) => {
    await moveItem(itemId, target);
    set({ moveItemId: null });
    await get().refresh();
    get().bumpVersion();
    const label = describeTarget(target, get().notebooks, get().sections);
    get().showToast({ text: `已移动到 ${label}` });
  },

  createNotebookWithSection: async (name) => {
    const notebook = await createNotebook(name);
    const section = await createSection(notebook.id, '分区 1');
    await get().refresh();
    get().bumpVersion();
    return section;
  },

  createSectionInNotebook: async (notebookId, name) => {
    const section = await createSection(notebookId, name);
    await get().refresh();
    get().bumpVersion();
    return section;
  },
}));

async function countInbox(): Promise<number> {
  const items = await listItems({ sectionId: INBOX_ID });
  return items.length;
}
