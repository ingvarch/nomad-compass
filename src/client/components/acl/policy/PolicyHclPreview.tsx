interface PolicyHclPreviewProps {
  hcl: string;
  onChange: (hcl: string) => void;
  editable: boolean;
  error: string | null;
}

export function PolicyHclPreview({ hcl, onChange, editable, error }: PolicyHclPreviewProps) {
  return (
    <div className="relative h-full">
      <textarea
        value={hcl}
        onChange={(e) => onChange(e.target.value)}
        readOnly={!editable}
        placeholder="# Policy rules will appear here..."
        className={`w-full h-[450px] p-3 font-mono text-sm resize-none border-0 focus:ring-0 ${
          editable
            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
            : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 cursor-default'
        } ${error ? 'border-red-500' : ''}`}
        spellCheck={false}
      />

      {/* Error indicator */}
      {error && (
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-red-50 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Mode indicator */}
      {!error && (
        <div className="absolute bottom-0 right-0 px-2 py-1 text-xs text-gray-400 dark:text-gray-500">
          {editable ? 'Editing' : 'Preview'}
        </div>
      )}
    </div>
  );
}
