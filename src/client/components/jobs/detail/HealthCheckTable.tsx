import React from 'react';
import {
  tableStyles,
  tableHeaderStyles,
  tableHeaderCellStyles,
  tableBodyStyles,
} from '../../../lib/styles';

interface Check {
  Type: string;
  Path?: string;
  Command?: string;
  Interval?: number;
  Timeout?: number;
  CheckRestart?: {
    Limit: number;
    Grace: number;
  };
}

interface Service {
  Name: string;
  Checks?: Check[];
}

interface HealthCheckTableProps {
  services: Service[];
}

const HealthCheckTable: React.FC<HealthCheckTableProps> = ({ services }) => {
  if (!services?.length) {
    return null;
  }

  return (
    <>
      {services.map((service, index) => {
        if (!service.Checks?.length) {
          return null;
        }

        return (
          <div key={index} className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Health Check for {service.Name}
            </h5>
            <div className="overflow-x-auto">
              <table className={tableStyles}>
                <thead className={tableHeaderStyles}>
                  <tr>
                    <th className={tableHeaderCellStyles}>Type</th>
                    <th className={tableHeaderCellStyles}>Path/Command</th>
                    <th className={tableHeaderCellStyles}>Interval</th>
                    <th className={tableHeaderCellStyles}>Timeout</th>
                    <th className={tableHeaderCellStyles}>Check Restart</th>
                  </tr>
                </thead>
                <tbody className={tableBodyStyles}>
                  {service.Checks.map((check, checkIndex) => (
                    <tr key={checkIndex}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {check.Type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {check.Path || check.Command || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {check.Interval
                          ? `${Math.round(check.Interval / 1000000000)}s`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {check.Timeout
                          ? `${Math.round(check.Timeout / 1000000000)}s`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {check.CheckRestart ? (
                          <div>
                            <span>Limit: {check.CheckRestart.Limit}</span>
                            <br />
                            <span>
                              Grace: {Math.round(check.CheckRestart.Grace / 1000000000)}s
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default HealthCheckTable;
