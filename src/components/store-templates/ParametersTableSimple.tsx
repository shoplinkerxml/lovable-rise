import React from 'react';
import { XMLStructure } from '@/lib/xml-template-service';
import { EditableXMLTable } from './EditableXMLTable';

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

  // Группировка по категориям
  const groupedFields = structure.fields.reduce((acc, field) => {
    const category = field.category || 'Інше';
    if (!acc[category]) acc[category] = [];
    acc[category].push(field);
    return acc;
  }, {} as Record<string, typeof structure.fields>);

  // Порядок категорий
  const categoryOrder = [
    'Основна інформація',
    'Валюти',
    'Категорії',
    'Атрибути товару',
    'Параметри товару',
    'Характеристики товару'
  ];

  const handleFieldsChange = (category: string, newFields: typeof structure.fields) => {
    if (!onStructureChange) return;
    
    // Просто обновляем поля для конкретной категории
    const otherFields = structure.fields.filter(f => (f.category || 'Інше') !== category);
    const allFields = [...otherFields, ...newFields];
    
    onStructureChange({
      ...structure,
      fields: allFields
    });
  };

  return (
    <div className="space-y-6">
      {categoryOrder.map(category => {
        const fields = groupedFields[category];
        if (!fields || fields.length === 0) return null;

        return (
          <EditableXMLTable
            key={category}
            category={category}
            fields={fields}
            onFieldsChange={(newFields) => handleFieldsChange(category, newFields)}
          />
        );
      })}
    </div>
  );
};
