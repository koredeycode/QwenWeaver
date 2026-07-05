import React from 'react';

interface UserAvatarProps {
  name?: string;
  image?: string | null;
  size?: number;
}

const COLORS = [
  '#f97316',
  '#2563eb',
  '#059669',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#d97706',
  '#9333ea',
  '#16a34a',
  '#e11d48',
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const UserAvatar = React.memo(({ name = '?', image, size = 28 }: UserAvatarProps) => {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  const bg = hashColor(name);
  const init = initials(name);

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: Math.max(size * 0.4, 10),
      }}
    >
      {init}
    </div>
  );
});

UserAvatar.displayName = 'UserAvatar';
