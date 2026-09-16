import { createNotebook, createSection, listNotebooks, saveItem } from './index';

const SEED_FLAG = 'sparkling:seeded';

const SAMPLE_TEXT = [
  '闪记只做一件事：让灵感活到下一秒。',
  '',
  '· 打开就是记录入口：点一下开始录音，再点一下停止；想打字就直接敲，回车即存。',
  '· 记录前不做任何选择：保存卡片默认就是「新灵感」，直接关掉卡片也会存进去，不会丢。',
  '· 归类发生在记录之后：在保存卡片里选笔记本和分区，之后也能随时把这条灵感移过去。',
  '· 一条灵感可以同时装文字、多段录音和多张照片，哼唱和歌词可以放在一起。',
  '',
  '这条示例可以直接改写或删掉，它只是帮你先看懂结构。',
].join('\n');

function readFlag(): boolean {
  try {
    return localStorage.getItem(SEED_FLAG) === '1';
  } catch {
    return false;
  }
}

function writeFlag(): void {
  try {
    localStorage.setItem(SEED_FLAG, '1');
  } catch {
    /* 隐私模式下写不了，忽略即可 */
  }
}

export async function ensureSeedData(): Promise<void> {
  if (readFlag()) return;
  const notebooks = await listNotebooks();
  writeFlag();
  if (notebooks.length > 0) return;

  const notebook = await createNotebook('我的第一个作品');
  const firstSection = await createSection(notebook.id, '分区 1');
  await createSection(notebook.id, '分区 2');
  await saveItem({
    title: '这是闪记的第一条灵感',
    text: SAMPLE_TEXT,
    notebookId: notebook.id,
    sectionId: firstSection.id,
  });
}
