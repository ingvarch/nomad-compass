import React from 'react';

interface TerminalAccessoryBarProps {
  onSendInput: (data: string) => void;
  disabled?: boolean;
}

interface KeyAction {
  label: string;
  data: string;
  ariaLabel?: string;
}

const ACCESSORY_KEYS: KeyAction[] = [
  { label: 'ESC', data: '\x1b', ariaLabel: 'Escape' },
  { label: 'TAB', data: '\t', ariaLabel: 'Tab' },
  { label: 'Ctrl+C', data: '\x03', ariaLabel: 'Interrupt (Control C)' },
  { label: 'Ctrl+D', data: '\x04', ariaLabel: 'End of file (Control D)' },
  { label: '↑', data: '\x1b[A', ariaLabel: 'Up arrow' },
  { label: '↓', data: '\x1b[B', ariaLabel: 'Down arrow' },
  { label: 'Clear', data: 'clear\r', ariaLabel: 'Clear screen' },
];

export const TerminalAccessoryBar: React.FC<TerminalAccessoryBarProps> = ({
  onSendInput,
  disabled = false,
}) => {
  return (
    <div
      aria-label="Mobile terminal accessory keys"
      className="sm:hidden flex items-center justify-between px-2 py-1.5 bg-gray-900 border-t border-gray-700/80 overflow-x-auto no-scrollbar gap-1.5 select-none"
    >
      {ACCESSORY_KEYS.map((k) => (
        <button
          key={k.label}
          type="button"
          disabled={disabled}
          onClick={() => onSendInput(k.data)}
          aria-label={k.ariaLabel || k.label}
          className="flex-1 min-w-[44px] py-1.5 px-2 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50 disabled:pointer-events-none text-gray-200 rounded text-xs font-mono font-medium text-center shadow-xs transition-colors"
        >
          {k.label}
        </button>
      ))}
    </div>
  );
};

export default TerminalAccessoryBar;

