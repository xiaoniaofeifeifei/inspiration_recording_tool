import { useEffect, useState } from 'react';
import { getBlob, getItem, listItems } from '../db';
import type { Item, ItemFilter } from '../types';
import { useStore } from '../store/useStore';

export function useItems(filter: ItemFilter): Item[] | null {
  const version = useStore((state) => state.version);
  const ready = useStore((state) => state.ready);
  const [items, setItems] = useState<Item[] | null>(null);
  const key = JSON.stringify(filter);

  useEffect(() => {
    if (!ready) return undefined;
    let alive = true;
    void listItems(JSON.parse(key) as ItemFilter).then((result) => {
      if (alive) setItems(result);
    });
    return () => {
      alive = false;
    };
  }, [key, version, ready]);

  return items;
}

export function useItem(id: string | undefined): Item | null | undefined {
  const [item, setItem] = useState<Item | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setItem(null);
      return undefined;
    }
    let alive = true;
    setItem(undefined);
    void getItem(id).then((result) => {
      if (alive) setItem(result);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  return item;
}

export function useBlobUrl(blobId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blobId) {
      setUrl(null);
      return undefined;
    }
    let alive = true;
    let objectUrl: string | null = null;
    void getBlob(blobId).then((blob) => {
      if (!alive || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobId]);

  return url;
}

export function useObjectUrl(blob: Blob | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return url;
}
