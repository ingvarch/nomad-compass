import React from 'react';
import { Badge } from '../../ui';
import {
  tableStyles,
  tableHeaderStyles,
  tableHeaderCellStyles,
  tableBodyStyles,
  tableCellStyles,
} from '../../../lib/styles';

interface Port {
  Label: string;
  Value?: number;
  To?: number;
  TaskName?: string;
}

interface Network {
  Mode: string;
  DynamicPorts?: Port[];
  ReservedPorts?: Port[];
}

interface NetworkTableProps {
  networks: Network[];
}

function hasTaskNames(ports?: Port[]): boolean {
  return ports?.some((p) => !!p.TaskName) ?? false;
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

        const showTaskNameDynamic = hasTaskNames(network.DynamicPorts);
        const showTaskNameReserved = hasTaskNames(network.ReservedPorts);

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
                        {showTaskNameDynamic && <th className={tableHeaderCellStyles}>Task</th>}
                        <th className={tableHeaderCellStyles}>Host Port</th>
                        <th className={tableHeaderCellStyles}>Container Port</th>
                      </tr>
                    </thead>
                    <tbody className={tableBodyStyles}>
                      {network.DynamicPorts!.map((port, portIndex) => (
                        <tr key={portIndex}>
                          <td className={tableCellStyles}>{port.Label}</td>
                          {showTaskNameDynamic && (
                            <td className={tableCellStyles}>{port.TaskName || '-'}</td>
                          )}
                          <td className={tableCellStyles}>
                            <Badge variant="yellow">Dynamic</Badge>
                          </td>
                          <td className={tableCellStyles}>{port.To || port.Value || '-'}</td>
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
                        {showTaskNameReserved && <th className={tableHeaderCellStyles}>Task</th>}
                        <th className={tableHeaderCellStyles}>Host Port</th>
                        <th className={tableHeaderCellStyles}>Container Port</th>
                      </tr>
                    </thead>
                    <tbody className={tableBodyStyles}>
                      {network.ReservedPorts!.map((port, portIndex) => (
                        <tr key={portIndex}>
                          <td className={tableCellStyles}>{port.Label}</td>
                          {showTaskNameReserved && (
                            <td className={tableCellStyles}>{port.TaskName || '-'}</td>
                          )}
                          <td className={tableCellStyles}>{port.Value}</td>
                          <td className={tableCellStyles}>{port.To || port.Value || '-'}</td>
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
