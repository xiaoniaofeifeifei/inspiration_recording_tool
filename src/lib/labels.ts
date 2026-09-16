import { INBOX_ID, INBOX_NAME } from '../types';
import type { Notebook, Section } from '../types';

export interface Target {
  notebookId: string | null;
  sectionId: string;
}

export function defaultTarget(): Target {
  return { notebookId: null, sectionId: INBOX_ID };
}

export function notebookOf(sections: Section[], sectionId: string): string | null {
  return sections.find((section) => section.id === sectionId)?.notebookId ?? null;
}

export function describeTarget(
  target: Target,
  notebooks: Notebook[],
  sections: Section[],
): string {
  if (!target.sectionId || target.sectionId === INBOX_ID) return INBOX_NAME;
  const section = sections.find((item) => item.id === target.sectionId);
  if (!section) return INBOX_NAME;
  const notebook = notebooks.find((item) => item.id === section.notebookId);
  return notebook ? `${notebook.name} / ${section.name}` : section.name;
}
