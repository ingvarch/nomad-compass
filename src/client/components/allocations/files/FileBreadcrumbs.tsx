import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { filesPagePath, pathCrumbs } from '../../../lib/services/allocFilesService';

interface FileBreadcrumbsProps {
  allocId: string;
  path: string;
}

const linkStyles = 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline';

/**
 * Path from the allocation directory root; every part but the last links to its directory.
 */
export function FileBreadcrumbs({ allocId, path }: FileBreadcrumbsProps) {
  const crumbs = [{ name: allocId.slice(0, 8), path: '/' }, ...pathCrumbs(path)];

  return (
    <nav aria-label="Path" className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm font-mono break-all">
      {crumbs.map((crumb, i) => (
        <Fragment key={crumb.path}>
          {i > 0 && <span aria-hidden="true" className="text-gray-400 dark:text-gray-500">/</span>}
          {i === crumbs.length - 1 ? (
            <span aria-current="page" className="font-semibold text-gray-900 dark:text-gray-100">{crumb.name}</span>
          ) : (
            <Link to={filesPagePath(allocId, crumb.path)} className={linkStyles}>
              {crumb.name}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
