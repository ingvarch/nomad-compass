import React from 'react';
import InfoBox from '../../../ui/InfoBox';

const NomadEnvironmentInfo: React.FC = () => {
  return (
    <InfoBox title="Nomad Runtime Environment Variables" type="info">
      <p>
        Nomad injects these variables inside the container at runtime:
      </p>
      <ul className="mt-1 ml-4 list-disc">
        <li>General: <code>NOMAD_ALLOC_ID</code> - Allocation ID</li>
        <li>Network: <code>NOMAD_PORT_<em>label</em></code> - Port values</li>
        <li>Network: <code>NOMAD_ADDR_<em>label</em></code> - IP:port for service ports</li>
        <li>Tasks: <code>NOMAD_TASK_NAME</code> - Name of the task</li>
      </ul>
      <p className="mt-2">
        To see all variables: add a command like <code>env | grep NOMAD</code> to your container
      </p>
    </InfoBox>
  );
};

export default NomadEnvironmentInfo; 