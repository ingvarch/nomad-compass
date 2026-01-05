import React from 'react';

interface Port {
  Label: string;
  Value?: number;
  To?: number;
}

interface Network {
  Mode: string;
  DynamicPorts?: Port[];
  ReservedPorts?: Port[];
}

interface NetworkTableProps {
  networks: Network[];
}

export const NetworkTable: React.FC<NetworkTableProps> = ({ networks }) => {
  if (!networks?.length) {
    return null;
  }

  return (
    <>
      {networks.map((network, index) => {
        const hasDynamic = network.DynamicPorts && network.DynamicPorts.length > 0;
        const hasReserved = network.ReservedPorts && network.ReservedPorts.length > 0;

        if (!hasDynamic && !hasReserved) {
          return null;
        }

        return (
          <div key={index} className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Network Configuration (Mode: {network.Mode})
            </h5>

            {hasDynamic && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Dynamic Ports
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Label
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Host Port
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Container Port
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {network.DynamicPorts!.map((port, portIndex) => (
                        <tr key={portIndex}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {port.Label}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Dynamic
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {port.To || port.Value || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {hasReserved && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Static Ports
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Label
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Host Port
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Container Port
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {network.ReservedPorts!.map((port, portIndex) => (
                        <tr key={portIndex}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {port.Label}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {port.Value}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {port.To || port.Value || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default NetworkTable;
