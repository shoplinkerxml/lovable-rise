import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Zap, Link2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { XMLField, MappingRule } from '@/lib/xml-template-service';

interface SimpleMappingViewProps {
  xmlFields: XMLField[];
  systemFields: SystemField[];
  mappings: MappingRule[];
  onMappingChange: (mappings: MappingRule[]) => void;
}

export interface SystemField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  category: string;
}

export const SimpleMappingView: React.FC<SimpleMappingViewProps> = ({
  xmlFields,
  systemFields,
  mappings,
  onMappingChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const autoMatch = () => {
    const suggestions: Record<string, string> = {
      'price': 'price', 'ціна': 'price',
      'name': 'name', 'назва': 'name', 'title': 'name',
      'description': 'description', 'опис': 'description',
      'currency': 'currency', 'валюта': 'currency',
      'category': 'category_id', 'категорія': 'category_id',
      'image': 'images', 'picture': 'images', 'зображення': 'images',
      'url': 'url', 'link': 'url', 'посилання': 'url',
      'sku': 'sku', 'артикул': 'sku',
      'id': 'external_id',
      'stock': 'stock_quantity', 'quantity': 'stock_quantity', 'кількість': 'stock_quantity',
      'vendor': 'vendor', 'виробник': 'vendor',
      'brand': 'brand', 'бренд': 'brand'
    };

    const newMappings: MappingRule[] = [];
    xmlFields.forEach(field => {
      const lower = field.path.toLowerCase();
      for (const [key, value] of Object.entries(suggestions)) {
        if (lower.includes(key)) {
          newMappings.push({
            sourceField: field.path,
            targetField: value,
            transformation: { type: 'direct', params: {} }
          });
          break;
        }
      }
    });

    onMappingChange(newMappings);
    toast.success(`Автоматично зв'язано ${newMappings.length} полів`);
  };

  const updateMapping = (xmlPath: string, systemFieldId: string | null) => {
    let newMappings = [...mappings];
    const existingIndex = newMappings.findIndex(m => m.sourceField === xmlPath);
    
    if (systemFieldId === null) {
      if (existingIndex >= 0) {
        newMappings.splice(existingIndex, 1);
      }
    } else {
      const newMapping: MappingRule = {
        sourceField: xmlPath,
        targetField: systemFieldId,
        transformation: { type: 'direct', params: {} }
      };

      if (existingIndex >= 0) {
        newMappings[existingIndex] = newMapping;
      } else {
        newMappings.push(newMapping);
      }
    }
    
    onMappingChange(newMappings);
  };

  const getCurrentMapping = (xmlPath: string) => {
    return mappings.find(m => m.sourceField === xmlPath);
  };

  const filteredFields = xmlFields.filter(field => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return field.path.toLowerCase().includes(query) || 
           (field.sample && field.sample.toLowerCase().includes(query));
  });

  const groupByCategory = (fields: XMLField[]) => {
    const groups: Record<string, XMLField[]> = {};
    fields.forEach(field => {
      const cat = field.category || 'Інше';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(field);
    });
    return groups;
  };

  const groupedFields = groupByCategory(filteredFields);
  const mappedCount = mappings.length;
  const totalCount = xmlFields.length;

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Зв'язування полів</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Знайдено {totalCount} полів у XML, зв'язано {mappedCount}
              </p>
            </div>
            <Button onClick={autoMatch} className="gap-2">
              <Zap className="h-4 w-4" />
              Автозаповнення
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Пошук */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Пошук полів..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="pl-10" 
        />
      </div>

      {/* Список полів */}
      <div className="space-y-4">
        {Object.keys(groupedFields).map(category => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {groupedFields[category].map((field, idx) => {
                const currentMapping = getCurrentMapping(field.path);
                const isMapped = !!currentMapping;
                const systemField = isMapped 
                  ? systemFields.find(f => f.id === currentMapping.targetField)
                  : null;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      isMapped ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* XML поле */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {field.path.split('.').pop()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                        </div>
                        {field.sample && (
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            Приклад: {field.sample}
                          </div>
                        )}
                      </div>

                      {/* Стрілка */}
                      {isMapped && (
                        <ArrowRight className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                      {!isMapped && (
                        <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      )}

                      {/* Системне поле */}
                      <div className="flex-1">
                        <Select
                          value={currentMapping?.targetField || ''}
                          onValueChange={(value) => updateMapping(field.path, value || null)}
                        >
                          <SelectTrigger className={isMapped ? 'border-green-300' : ''}>
                            <SelectValue placeholder="Вибрати поле..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-muted-foreground">
                              Не зв'язувати
                            </SelectItem>
                            {systemFields.map(sField => (
                              <SelectItem key={sField.id} value={sField.id}>
                                <div className="flex items-center gap-2">
                                  <span>{sField.label}</span>
                                  {sField.required && (
                                    <span className="text-red-500 text-xs">*</span>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {sField.type}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {systemField && (
                          <div className="text-xs text-green-600 mt-1">
                            ✓ {systemField.label}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
