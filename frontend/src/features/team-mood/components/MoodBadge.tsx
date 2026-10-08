import React from 'react';
import type { TeamMoodType } from '../types';
import { MOOD_META } from '../utils';

interface MoodBadgeProps {
  mood: TeamMoodType;
  showIcon?: boolean;
  className?: string;
}

export const MoodBadge: React.FC<MoodBadgeProps> = ({ mood, showIcon = true, className = '' }) => {
  const meta = MOOD_META[mood];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.border} ${meta.text} ${className}`}
    >
      {showIcon && <Icon className={`h-3.5 w-3.5 ${meta.iconColor}`} aria-hidden="true" />}
      <span>{meta.label}</span>
    </span>
  );
};
