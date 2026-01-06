import { useState } from 'react';
import { NomadNodeDetail } from '../../types/nomad';
import ExpandIcon from '../ui/ExpandIcon';

interface NodeAttributesProps {
  node: NomadNodeDetail;
}

// Group attributes by prefix for better organization
function groupAttributes(attributes: Record<string, string>): Record<string, Record<string, string>> {
  const groups: Record<string, Record<string, string>> = {};

  Object.entries(attributes).forEach(([key, value]) => {
    const parts = key.split('.');
    const group = parts[0];
    const subkey = parts.slice(1).join('.') || key;

    if (!groups[group]) {
      groups[group] = {};
    }
    groups[group][subkey] = value;
  });

  return groups;
}

export function NodeAttributes({ node }: NodeAttributesProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    driver: true,
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const attributeGroups = node.Attributes ? groupAttributes(node.Attributes) : {};

  return (
    <div className="space-y-6">
      {/* Drivers Section */}
      {node.Drivers && Object.keys(node.Drivers).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Drivers</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(node.Drivers).map(([name, driver]) => (
              <div
                key={name}
                className={`p-3 rounded-lg border ${
                  driver.Healthy
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : driver.Detected
                      ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                  <div className="flex gap-1">
                    {driver.Detected && (
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        driver.Healthy
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {driver.Healthy ? 'healthy' : 'unhealthy'}
                      </span>
                    )}
                    {!driver.Detected && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        not detected
                      </span>
                    )}
                  </div>
                </div>
                {driver.HealthDescription && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {driver.HealthDescription}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Host Volumes Section */}
      {node.HostVolumes && Object.keys(node.HostVolumes).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Host Volumes</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Path</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(node.HostVolumes).map(([name, volume]) => (
                  <tr key={name}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{name}</td>
                    <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400">{volume.Path}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        volume.ReadOnly
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}>
                        {volume.ReadOnly ? 'read-only' : 'read-write'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attributes Section */}
      {Object.keys(attributeGroups).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Attributes</h4>
          <div className="space-y-2">
            {Object.entries(attributeGroups)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([group, attrs]) => (
                <div key={group} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="font-medium text-gray-900 dark:text-white capitalize">{group}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Object.keys(attrs).length} attributes
                      </span>
                      <ExpandIcon isExpanded={expandedGroups[group]} className="h-4 w-4" />
                    </div>
                  </button>
                  {expandedGroups[group] && (
                    <div className="px-4 py-2 divide-y divide-gray-100 dark:divide-gray-700">
                      {Object.entries(attrs)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([key, value]) => (
                          <div key={key} className="py-1 flex justify-between gap-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{key}</span>
                            <span className="text-sm font-mono text-gray-900 dark:text-white text-right truncate max-w-xs">
                              {value}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!node.Drivers && !node.HostVolumes && Object.keys(attributeGroups).length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No attributes available
        </div>
      )}
    </div>
  );
}
