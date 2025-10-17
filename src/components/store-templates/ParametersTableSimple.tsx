import React from 'react';
import { XMLStructure } from '@/lib/xml-template-service';
import { InteractiveXmlTree } from './InteractiveXmlTree';

interface ParametersTableProps {
  structure: XMLStructure | null;
  onStructureChange?: (structure: XMLStructure) => void;
}

export const ParametersTable: React.FC<ParametersTableProps> = ({ 
  structure,
  onStructureChange 
}) => {
  if (!structure || !structure.fields || structure.fields.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Завантажте XML файл для перегляду структури</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <InteractiveXmlTree 
        structure={structure}
        onSave={onStructureChange}
      />
    </div>
  );
};
