export type BadgeColorVariant = 'blue' | 'purple' | 'green' | 'red' | 'yellow' | 'gray';

export interface BadgeColorConfig {
  bg: string;
  text: string;
  hoverText: string;
}

export const badgeColors: Record<BadgeColorVariant, BadgeColorConfig> = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-800 dark:text-blue-200',
    hoverText: 'hover:text-blue-600 dark:hover:text-blue-100',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-300',
    hoverText: 'hover:text-purple-600 dark:hover:text-purple-200',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    hoverText: 'hover:text-green-600 dark:hover:text-green-200',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    hoverText: 'hover:text-red-600 dark:hover:text-red-200',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
    hoverText: 'hover:text-yellow-600 dark:hover:text-yellow-200',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-800 dark:text-gray-200',
    hoverText: 'hover:text-gray-600 dark:hover:text-gray-100',
  },
};
