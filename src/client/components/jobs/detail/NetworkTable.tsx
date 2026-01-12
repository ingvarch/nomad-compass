import React from 'react';
import {
  tableStyles,
  tableHeaderStyles,
  tableHeaderCellStyles,
  tableBodyStyles,
} from '../../../lib/styles';

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

const NetworkTable: React.FC<NetworkTableProps> = ({ networks }) => {
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
                  <table className={tableStyles}>
                    <thead className={tableHeaderStyles}>
                      <tr>
                        <th className={tableHeaderCellStyles}>Label</th>
                        <th className={tableHeaderCellStyles}>Host Port</th>
                        <th className={tableHeaderCellStyles}>Container Port</th>
                      </tr>
                    </thead>
                    <tbody className={tableBodyStyles}>
                      {network.DynamicPorts!.map((port, portIndex) => (
                        <tr key={portIndex}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {port.Label}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Dynamic
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                  <table className={tableStyles}>
                    <thead className={tableHeaderStyles}>
                      <tr>
                        <th className={tableHeaderCellStyles}>Label</th>
                        <th className={tableHeaderCellStyles}>Host Port</th>
                        <th className={tableHeaderCellStyles}>Container Port</th>
                      </tr>
                    </thead>
                    <tbody className={tableBodyStyles}>
                      {network.ReservedPorts!.map((port, portIndex) => (
                        <tr key={portIndex}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {port.Label}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {port.Value}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
