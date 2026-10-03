import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { createNomadClient } from '../../../lib/api/nomad';
import { FILE_PREVIEW_LIMIT, isBinary, languagesForFile } from '../../../lib/services/allocFilesService';
import { formatBytes } from '../../../lib/utils/formatBytes';
import { formatIsoDateLong } from '../../../lib/utils/dateFormatter';
import { highlightCode } from '../../../lib/utils/highlight';
import { buttonSecondaryStyles } from '../../../lib/styles';
import type { NomadAllocFileInfo } from '../../../types/nomad';

interface FileViewerProps {
  allocId: string;
  path: string;
  info: NomadAllocFileInfo;
  // The start of the file, or null when it is not a regular file and was not read
  bytes: Uint8Array | null;
}

function Notice({ children }: { children: string }) {
  return <p className="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">{children}</p>;
}

function FileContent({ name, bytes }: { name: string; bytes: Uint8Array }) {
  const text = useMemo(() => new TextDecoder().decode(bytes), [bytes]);
  const html = useMemo(() => {
    const languages = languagesForFile(name);
    return languages.length > 0 ? highlightCode(text, languages) : null;
  }, [text, name]);

  return (
    <pre className="code-view overflow-auto px-4 py-3 text-sm leading-relaxed font-mono text-gray-800 dark:text-monokai-text bg-gray-50 dark:bg-monokai-bg">
      {html !== null ? (
        // highlightCode escapes the file content
        <code data-testid="file-content" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <code data-testid="file-content">{text}</code>
      )}
    </pre>
  );
}

/**
 * Metadata, a download link and the start of a file; a binary file is only a download.
 */
export function FileViewer({ allocId, path, info, bytes }: FileViewerProps) {
  const isTruncated = info.Size > FILE_PREVIEW_LIMIT;

  let body;
  if (bytes === null) {
    body = <Notice>{`This is not a regular file (${info.FileMode}), so it cannot be shown.`}</Notice>;
  } else if (bytes.length === 0) {
    body = <Notice>Empty file.</Notice>;
  } else if (isBinary(bytes)) {
    body = <Notice>Binary file. Download it to open it.</Notice>;
  } else {
    body = <FileContent name={info.Name} bytes={bytes} />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex gap-1">
            <dt>Size</dt>
            <dd className="text-gray-900 dark:text-gray-100">{formatBytes(info.Size)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Mode</dt>
            <dd className="font-mono text-gray-900 dark:text-gray-100">{info.FileMode}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Modified</dt>
            <dd className="text-gray-900 dark:text-gray-100">{formatIsoDateLong(info.ModTime)}</dd>
          </div>
        </dl>
        {bytes !== null && (
          <a
            href={createNomadClient().allocFileDownloadUrl(allocId, path)}
            download={info.Name}
            className={`${buttonSecondaryStyles} shadow-sm`}
          >
            <Download aria-hidden="true" className="w-4 h-4 mr-1.5" />
            Download
          </a>
        )}
      </div>
      {isTruncated && bytes !== null && !isBinary(bytes) && (
        <p className="px-4 py-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50">
          {`Showing the first ${formatBytes(FILE_PREVIEW_LIMIT)} of ${formatBytes(info.Size)}. Download the file to see all of it.`}
        </p>
      )}
      {body}
    </div>
  );
}
