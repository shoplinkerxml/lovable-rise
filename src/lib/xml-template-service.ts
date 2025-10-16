import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export interface XMLStructure {
  root: string;
  fields: XMLField[];
  namespaces?: Record<string, string>;
}

export interface XMLField {
  path: string; // "offer.id", "offer.price"
  type: 'string' | 'number' | 'array' | 'object' | 'boolean';
  required: boolean;
  sample?: string;
  children?: XMLField[];
  category?: string; // Основна, Валюти, Категорії, Товар, Характеристики
  order?: number; // Порядок в XML
}

export interface MappingRule {
  sourceField: string; // XML path
  targetField: string; // System field
  transformation?: {
    type: 'direct' | 'concat' | 'split' | 'custom';
    params?: Record<string, any>;
  };
}

interface ParseStats {
  parseTime: number;
  size: number;
  itemsCount: number;
}

export class XMLTemplateService {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@',
      textNodeName: '_text',
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
      processEntities: true,
      allowBooleanAttributes: true,
      isArray: (name, jpath) => {
        // Помечаем элементы которые всегда массивы
        return ['currencies.currency', 'categories.category', 'offers.offer', 'offer.picture', 'offer.param'].includes(jpath);
      }
    });
  }

  // Парсинг XML с оптимизацией для больших файлов
  async parseXML(source: string | File): Promise<{
    structure: XMLStructure;
    data: any;
    stats: ParseStats;
  }> {
    const startTime = performance.now();
    
    let xmlContent: string;
    if (source instanceof File) {
      xmlContent = await this.readFileChunked(source);
    } else {
      xmlContent = await this.fetchXMLFromURL(source);
    }

    const parsed = this.parser.parse(xmlContent);
    const structure = this.extractStructure(parsed);
    
    const stats = {
      parseTime: performance.now() - startTime,
      size: xmlContent.length,
      itemsCount: this.countItems(parsed)
    };

    return { structure, data: parsed, stats };
  }

  // Чтение больших файлов по частям
  private async readFileChunked(file: File): Promise<string> {
    const chunkSize = 1024 * 1024; // 1MB chunks
    let offset = 0;
    let content = '';

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize);
      const text = await chunk.text();
      content += text;
      offset += chunkSize;
    }

    return content;
  }

  // Извлечение структуры XML с сохранением иерархии и порядка
  private extractStructure(data: any, path = ''): XMLStructure {
    const fields: XMLField[] = [];
    let orderCounter = 0;
    
    const getCategory = (fieldPath: string): string => {
      const lowerPath = fieldPath.toLowerCase();
      
      // Основна інформація (магазин)
      if (lowerPath.match(/^yml_catalog\.shop\.(name|company|url)$/)) {
        return 'Основна інформація';
      }
      
      // Валюти (только currencies.currency, НЕ offer.currencyId)
      if ((lowerPath.includes('currencies.currency') || lowerPath.includes('yml_catalog.shop.currencies')) && !lowerPath.includes('offer')) {
        return 'Валюти';
      }
      
      // Категорії (только categories.category, НЕ offer.categoryId)
      if ((lowerPath.includes('categories.category') || lowerPath.includes('yml_catalog.shop.categories')) && !lowerPath.includes('offer')) {
        return 'Категорії';
      }
      
      // Атрибути товару (id, available у offer)
      if (lowerPath.match(/offers\.offer\[\d+\]\.@/)) {
        return 'Атрибути товару';
      }
      
      // Характеристики товару (param)
      if (lowerPath.includes('.param')) {
        return 'Характеристики товару';
      }
      
      // Параметри товару (все остальное в offer, включая categoryId и currencyId)
      if (lowerPath.includes('offers.offer')) {
        return 'Параметри товару';
      }
      
      return 'Інше';
    };
    
    const traverse = (obj: any, currentPath: string, depth = 0) => {
      if (depth > 10) return;
      
      for (const [key, value] of Object.entries(obj)) {
        // Обрабатываем атрибуты (они начинаются с @)
        const isAttribute = key.startsWith('@');
        const cleanKey = isAttribute ? key : key.replace(/^@_/, '');
        
        const fieldPath = currentPath ? `${currentPath}.${cleanKey}` : cleanKey;
        const fieldType = this.detectType(value);
        
        // Для массивов
        if (Array.isArray(value) && value.length > 0) {
          const firstItem = value[0];
          
          if (typeof firstItem === 'object' && firstItem !== null) {
            // Массив объектов - обрабатываем каждый элемент
            value.forEach((item: any, index: number) => {
              traverse(item, `${fieldPath}[${index}]`, depth + 1);
            });
          } else {
            // Массив простых значений
            fields.push({
              path: fieldPath,
              type: 'array',
              required: false,
              sample: `[${value.slice(0, 3).join(', ')}${value.length > 3 ? '...' : ''}]`,
              category: getCategory(fieldPath),
              order: orderCounter++
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          // Для объектов с атрибутами и текстом (например, category или param)
          const valueObj = value as Record<string, any>;
          if (valueObj._text !== undefined) {
            // Сначала добавляем атрибуты (например, @name для param, @id для category)
            const attributes = Object.entries(valueObj).filter(([k]) => k.startsWith('@'));
            const sortedAttrs = attributes.sort((a, b) => {
              // @name всегда первый
              if (a[0] === '@name') return -1;
              if (b[0] === '@name') return 1;
              return 0;
            });
            
            for (const [attrKey, attrValue] of sortedAttrs) {
              fields.push({
                path: `${fieldPath}.${attrKey}`,
                type: this.detectType(attrValue),
                required: false,
                sample: this.getSample(attrValue),
                category: getCategory(`${fieldPath}.${attrKey}`),
                order: orderCounter++
              });
            }
            
            // Затем добавляем текст как отдельное поле (_text после @name)
            fields.push({
              path: fieldPath,
              type: this.detectType(valueObj._text),
              required: false,
              sample: this.getSample(valueObj._text),
              category: getCategory(fieldPath),
              order: orderCounter++
            });
          } else {
            // Объект без _text - рекурсивно обходим
            traverse(value, fieldPath, depth + 1);
          }
        } else {
          // Простое значение
          fields.push({
            path: fieldPath,
            type: fieldType,
            required: false,
            sample: this.getSample(value),
            category: getCategory(fieldPath),
            order: orderCounter++
          });
        }
      }
    };

    traverse(data, path, 0);

    return {
      root: Object.keys(data)[0] || 'root',
      fields: fields.sort((a, b) => (a.order || 0) - (b.order || 0))
    };
  }

  // Создание правил маппинга
  generateMappingRules(structure: XMLStructure): MappingRule[] {
    const commonMappings: Record<string, string> = {
      'offer.id': 'product_id',
      'offer.price': 'price',
      'offer.name': 'name',
      'offer.description': 'description',
      'offer.url': 'url',
      'offer.picture': 'images',
      'offer.vendor': 'brand',
      'offer.categoryId': 'category_id'
    };

    return structure.fields
      .filter(f => !f.children)
      .map(field => ({
        sourceField: field.path,
        targetField: commonMappings[field.path] || field.path.split('.').pop() || '',
        transformation: { type: 'direct' as const }
      }));
  }

  private detectType(value: any): XMLField['type'] {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'string';
    return typeof value as XMLField['type'];
  }

  private getSample(value: any): string {
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      const firstItem = value[0];
      if (typeof firstItem === 'object') {
        return `Array[${value.length}]`;
      }
      return String(firstItem).substring(0, 100);
    }
    if (typeof value === 'object' && value !== null) {
      return '{...}';
    }
    return String(value).substring(0, 100);
  }

  private countItems(data: any): number {
    // Подсчет количества элементов (товаров)
    const findArrays = (obj: any): number => {
      let count = 0;
      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) {
          count = Math.max(count, value.length);
        } else if (typeof value === 'object' && value !== null) {
          count = Math.max(count, findArrays(value));
        }
      }
      return count;
    };
    return findArrays(data);
  }

  private async fetchXMLFromURL(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch XML: ${response.statusText}`);
    return response.text();
  }
}
