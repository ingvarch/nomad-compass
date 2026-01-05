import React from 'react';

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

export const HealthCheckTable: React.FC<HealthCheckTableProps> = ({ services }) => {
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
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Path/Command
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Interval
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Timeout
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Check Restart
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
