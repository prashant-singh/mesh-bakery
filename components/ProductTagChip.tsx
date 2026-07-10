import type { CSSProperties } from 'react';

export type ProductTag = string | {
  name: string;
  color?: string;
};

type ProductTagChipProps = {
  tags?: ProductTag[];
};

const tagDeck: Record<string, { bg: string; fg: string; ring: string }> = {
  new: { bg: '#e7f3df', fg: '#3f5f31', ring: '#bad7aa' },
  premium: { bg: '#ede8fb', fg: '#584579', ring: '#d2c5ee' },
  sale: { bg: '#ffe8d6', fg: '#9a4924', ring: '#ffc59d' },
  popular: { bg: '#e4f0f4', fg: '#345c68', ring: '#b8d7e1' },
  restocked: { bg: '#f0ebe3', fg: '#665949', ring: '#d8cbb8' },
  limited: { bg: '#f8e6ea', fg: '#7c3d4c', ring: '#e5bac5' },
  customizable: { bg: '#fff2c7', fg: '#795622', ring: '#edd28a' },
};

function getTagName(tag: ProductTag) {
  return typeof tag === 'string' ? tag : tag.name;
}

export function ProductTagChip({ tags }: ProductTagChipProps) {
  const primaryTag = tags?.[0];
  if (!primaryTag) return null;

  const name = getTagName(primaryTag).trim();
  if (!name) return null;

  const normalizedName = name.toLowerCase();
  const customColor = typeof primaryTag === 'object' ? primaryTag.color : undefined;
  const palette = tagDeck[normalizedName] ?? { bg: '#f0ebe3', fg: '#3d3a36', ring: '#d8cbb8' };
  const style = customColor
    ? {
      backgroundColor: customColor,
      borderColor: customColor,
      color: '#2d2a26',
      boxShadow: '0 10px 22px rgba(45, 42, 38, 0.16), inset 0 1px rgba(255, 255, 255, 0.55)',
    } satisfies CSSProperties
    : {
      backgroundColor: palette.bg,
      borderColor: palette.ring,
      color: palette.fg,
      boxShadow: '0 10px 22px rgba(45, 42, 38, 0.16), inset 0 1px rgba(255, 255, 255, 0.62)',
    } satisfies CSSProperties;

  return (
    <span
      className="absolute -left-2.5 -top-2 z-30 inline-flex rotate-[-7deg] items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-[10px] font-black uppercase leading-none tracking-widest backdrop-blur transition-transform duration-200 group-hover:rotate-[-4deg] group-hover:scale-[1.03]"
      style={style}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-45" />
      {name}
    </span>
  );
}
