import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Copy,
  Eye, 
  EyeOff,
  Trash2,
  GripVertical,
  Save,
  X,
  DollarSign,
  Tag,
  Package,
  Image,
  Coins,
  FileText,
  Link,
  File,
  Settings,
  CreditCard,
  Folder,
  ListTree,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { XMLStructure } from '@/lib/xml-template-service';

interface ParametersTableProps {
  structure: XMLStructure | null;
  onStructureChange?: (structure: XMLStructure) => void;
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
}

export const ParametersTable: React.FC<ParametersTableProps> = ({ 
  structure,
  onStructureChange,
  onSave,
  onCancel,
  saving = false
}) => {
  const [hiddenFields, setHiddenFields] = useState<Set<number>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  if (!structure || !structure.fields || structure.fields.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Завантажте XML файл для перегляду структури</p>
      </div>
    );
  }

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast.success('XML шлях скопійовано');
  };

  const toggleVisibility = (index: number) => {
    const newHidden = new Set(hiddenFields);
    if (newHidden.has(index)) {
      newHidden.delete(index);
    } else {
      newHidden.add(index);
    }
    setHiddenFields(newHidden);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'string':
      case 'текст':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'number':
      case 'число':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'array':
      case 'масив':
        return 'bg-secondary/50 text-secondary-foreground border-secondary';
      case 'object':
      case "об'єкт":
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'boolean':
        return 'bg-accent/50 text-accent-foreground border-accent';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (field: any) => {
    const category = field.category || '';
    const lowerCategory = category.toLowerCase();
    
    // Проверяем по названию категории
    if (lowerCategory.includes('основна') || lowerCategory.includes('основная')) return Settings;
    if (lowerCategory.includes('валют')) return CreditCard;
    if (lowerCategory.includes('категор')) return Folder;
    if (lowerCategory.includes('параметр')) return ListTree;
    if (lowerCategory.includes('характеристик')) return Sparkles;
    
    // Проверяем по пути если категория не определена
    const lowerPath = field.path.toLowerCase();
    if (lowerPath.includes('price') || lowerPath.includes('ціна')) return DollarSign;
    if (lowerPath.includes('currency') || lowerPath.includes('валют')) return CreditCard;
    if (lowerPath.includes('category') || lowerPath.includes('категор')) return Folder;
    if (lowerPath.includes('image') || lowerPath.includes('зображ') || lowerPath.includes('picture')) return Image;
    if (lowerPath.includes('description') || lowerPath.includes('опис')) return FileText;
    if (lowerPath.includes('url') || lowerPath.includes('link')) return Link;
    if (lowerPath.includes('param')) return ListTree;
    
    return File;
  };

  const getDisplayName = (field: any) => {
    const pathParts = field.path.split('.');
    const lastName = pathParts[pathParts.length - 1];
    
    // Для характеристик с @name показываем значение @name
    if (field.path.includes('param') && field.path.includes('@name')) {
      return field.sample || lastName;
    }
    
    // Для валют с @id показываем код валюты
    if (field.path.includes('currency') && field.path.includes('@id')) {
      return field.sample || lastName;
    }
    
    // Для категорий с @id показываем название категории из соответствующего _text
    if (field.path.includes('category') && field.path.includes('@id')) {
      const basePath = field.path.replace('.@id', '');
      const textField = structure?.fields.find(f => f.path === basePath + '._text');
      return textField?.sample || lastName;
    }
    
    return lastName;
  };

  const getDisplayValue = (field: any) => {
    // Для характеристик с @name показываем значение из соответствующего _text
    if (field.path.includes('param') && field.path.endsWith('@name')) {
      const basePath = field.path.replace('.@name', '');
      const textField = structure?.fields.find(f => 
        f.path === basePath + '._text' || f.path === basePath
      );
      return textField?.sample || '-';
    }
    
    // Для валют с @id показываем курс из соответствующего @rate
    if (field.path.includes('currency') && field.path.endsWith('@id')) {
      const basePath = field.path.replace('.@id', '');
      const rateField = structure?.fields.find(f => f.path === basePath + '.@rate');
      return rateField?.sample || '-';
    }
    
    // Для категорий с @id показываем ID из самого поля
    if (field.path.includes('category') && field.path.endsWith('@id')) {
      return field.sample || '-';
    }
    
    // Для обычных полей просто возвращаем sample
    return field.sample || '-';
  };

  const getCategoryName = (field: any) => {
    return field.category || 'Інше';
  };

  const getShortPath = (path: string) => {
    const parts = path.split('.');
    if (parts.length <= 2) return path;
    return '...' + parts.slice(-2).join('.');
  };

  const deleteField = (index: number) => {
    if (!structure || !onStructureChange) return;
    
    const newFields = structure.fields.filter((_, i) => i !== index);
    onStructureChange({
      ...structure,
      fields: newFields
    });
    toast.success('Поле видалено');
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || !structure || !onStructureChange) return;
    
    const newFields = [...structure.fields];
    const draggedField = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedField);
    
    onStructureChange({
      ...structure,
      fields: newFields
    });
    
    setDraggedIndex(null);
    toast.success('Порядок змінено');
  };

  return (
    <div className="space-y-4">
      {/* Заголовок с кнопками */}
      {(onSave || onCancel) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg">Структура XML</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Перегляньте та редагуйте структуру шаблону
                </p>
              </div>
              <div className="flex items-center gap-2">
                {onCancel && (
                  <Button variant="outline" size="icon" onClick={onCancel} disabled={saving} title="Скасувати">
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {onSave && (
                  <Button variant="default" size="icon" onClick={onSave} disabled={saving} title="Зберегти">
                    <Save className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-12"></TableHead>
            <TableHead className="font-semibold">Назва параметра</TableHead>
            <TableHead className="font-semibold">Значення (приклад)</TableHead>
            <TableHead className="font-semibold">XML шлях</TableHead>
            <TableHead className="font-semibold">Категорія</TableHead>
            <TableHead className="w-40 font-semibold">Дії</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {structure.fields
            .filter(field => {
              // Полностью скрываем _text поля для param элементов, так как их значения показываются в @name строке
              if (field.path.includes('param') && field.path.endsWith('_text')) {
                const basePath = field.path.replace('._text', '');
                const hasNameField = structure.fields.some(f => f.path === basePath + '.@name');
                if (hasNameField) return false;
              }
              
              // Скрываем @rate поля для валют, так как они показываются в @id строке
              if (field.path.includes('currency') && field.path.endsWith('@rate')) {
                const basePath = field.path.replace('.@rate', '');
                const hasIdField = structure.fields.some(f => f.path === basePath + '.@id');
                if (hasIdField) return false;
              }
              
              // Скрываем _text поля для категорий, так как они показываются в @id строке
              if (field.path.includes('category') && field.path.endsWith('_text')) {
                const basePath = field.path.replace('._text', '');
                const hasIdField = structure.fields.some(f => f.path === basePath + '.@id');
                if (hasIdField) return false;
              }
              
              return true;
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((field, index) => (
            <TableRow 
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => setDraggedIndex(null)}
              className={`
                ${hiddenFields.has(index) ? 'opacity-50' : ''}
                ${draggedIndex === index ? 'opacity-30 bg-accent/20' : ''}
                hover:bg-gray-50 transition-colors cursor-move
              `}
            >
              <TableCell className="cursor-move">
                <GripVertical className="h-4 w-4 text-gray-400" />
              </TableCell>
              
              <TableCell>
                <div className="font-medium">{getDisplayName(field)}</div>
              </TableCell>
              
              <TableCell>
                <div className="text-gray-600 truncate max-w-xs" title={getDisplayValue(field)}>
                  {getDisplayValue(field)}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono" title={field.path}>
                    {getShortPath(field.path)}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyPath(field.path)}
                    className="h-6 w-6 p-0"
                    title="Копіювати повний шлях"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-2">
                  {React.createElement(getCategoryIcon(field), { className: 'h-4 w-4 text-muted-foreground' })}
                  <span className="text-sm text-gray-600">{getCategoryName(field)}</span>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleVisibility(index)}
                    className="h-8 w-8 p-0"
                    title={hiddenFields.has(index) ? 'Показати' : 'Приховати'}
                  >
                    {hiddenFields.has(index) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteField(index)}
                    className="h-8 w-8 p-0 hover:bg-destructive/10"
                    title="Видалити"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};
