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

// Типы XML форматов
export type XMLFormatType = 'rozetka' | 'epicentr' | 'prom' | 'price' | 'mma' | 'custom' | 'unknown';

interface XMLFormat {
  type: XMLFormatType;
  productPath: string; // Путь к товарам: 'offers.offer' или 'items.item'
  categoryPath: string; // Путь к категориям
  paramPath: string; // Путь к характеристикам внутри товара
}

export class XMLTemplateService {
  private parser: XMLParser;
  private detectedFormat?: XMLFormat;

  constructor() {
    // Парсер с универсальной конфигурацией
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
        // Универсальное определение массивов
        // YML формат
        if (['currencies.currency', 'categories.category', 'offers.offer', 'offer.picture', 'offer.param'].includes(jpath)) {
          return true;
        }
        // Shop-items формат
        if (jpath.match(/\.(items?\.item|products?\.product|goods?\.good)$/)) {
          return true;
        }
        // Общие паттерны
        if (jpath.match(/\.(param|params|image|images|picture|pictures|photo|photos|category|categories|currency|currencies)$/)) {
          return true;
        }
        return false;
      }
    });
  }

  // Определение типа XML формата
  private detectXMLFormat(data: any): XMLFormat {
    const dataStr = JSON.stringify(data).toLowerCase();
    
    // Rozetka формат (YML с categories и currencies)
    if (dataStr.includes('yml_catalog') && dataStr.includes('categories') && dataStr.includes('currencies')) {
      return {
        type: 'rozetka',
        productPath: 'offers.offer',
        categoryPath: 'categories.category',
        paramPath: 'param'
      };
    }
    
    // Epicentr формат (YML без categories и currencies, с lang атрибутами)
    if (dataStr.includes('yml_catalog') || (dataStr.includes('offers') && dataStr.includes('offer'))) {
      return {
        type: 'epicentr',
        productPath: 'offers.offer',
        categoryPath: '',
        paramPath: 'param'
      };
    }
    
    // MMA формат (price.items.item с currency в корне)
    if (data.price && data.price.items && data.price.currency) {
      return {
        type: 'mma',
        productPath: 'items.item',
        categoryPath: 'catalog.category',
        paramPath: 'param'
      };
    }
    
    // Price формат (price.items.item)
    if (data.price && data.price.items) {
      return {
        type: 'price',
        productPath: 'items.item',
        categoryPath: 'categories.category',
        paramPath: 'param'
      };
    }
    
    // Prom формат (shop.items.item)
    if (dataStr.includes('shop') && (dataStr.includes('items') || dataStr.includes('item'))) {
      return {
        type: 'prom',
        productPath: 'items.item',
        categoryPath: 'catalog.category',
        paramPath: 'param'
      };
    }
    
    // Неизвестный формат - попробуем универсально
    return {
      type: 'unknown',
      productPath: '',
      categoryPath: '',
      paramPath: 'param'
    };
  }

  // Парсинг XML с оптимизацией для больших файлов
  async parseXML(source: string | File, userMapping?: {
    formatType: 'rozetka' | 'epicentr' | 'prom' | 'price' | 'mma' | 'custom';
    rootTag: string;
    productTag: string;
    categoryTag: string;
    currencyTag: string;
    paramTag: string;
  }): Promise<{
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
    
    // Используем маппинг пользователя или автоопределение
    if (userMapping) {
      this.detectedFormat = {
        type: userMapping.formatType,
        productPath: userMapping.productTag,
        categoryPath: userMapping.categoryTag,
        paramPath: userMapping.paramTag
      };
      console.log('User-defined XML format:', this.detectedFormat);
    } else {
      // Автоопределение формата
      this.detectedFormat = this.detectXMLFormat(parsed);
      console.log('Auto-detected XML format:', this.detectedFormat);
    }
    
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
      const format = this.detectedFormat;
      
      if (!format) return 'Інше';
      
      // Проверяем есть ли в пути секция товаров (пользовательский productPath)
      const productPathParts = format.productPath.toLowerCase().split('.');
      const hasProductPath = productPathParts.some(part => lowerPath.includes(part + '.') || lowerPath.includes(part + '['));
      
      // Основна інформація - поля корневого уровня и root атрибуты (@version, @encoding, @date), НЕ в товарах
      if (!hasProductPath && !lowerPath.includes('currencies') && !lowerPath.includes('currency') && 
          !lowerPath.match(/categor(y|ies)/)) {
        // Проверяем что это root-level поля (name, company, url, date) или атрибуты (@version, @encoding)
        const fieldName = lowerPath.split('.').pop() || '';
        if (fieldName.match(/^(name|company|url|shop_name|store_name|date)$/) ||
            fieldName.match(/^@(version|encoding|date)$/)) {
          return 'Основна інформація';
        }
      }
      
      // Валюти - проверяем по categoryPath или паттерну
      if (format.categoryPath) {
        const categoryPathLower = format.categoryPath.toLowerCase();
        if (lowerPath.includes(categoryPathLower) && !hasProductPath) {
          return 'Категорії';
        }
      }
      // Фолбек для категорий
      if (lowerPath.match(/categor(y|ies)/) && !hasProductPath) {
        return 'Категорії';
      }
      
      // Валюти - только секция валют, НЕ поля товара
      if (lowerPath.match(/currenc(y|ies)/) && !hasProductPath) {
        return 'Валюти';
      }
      
      // Характеристики товару - поля param с атрибутом name (может быть @name или просто name)
      const paramPathLower = format.paramPath.toLowerCase();
      if (lowerPath.includes(paramPathLower + '[') && hasProductPath) {
        // Проверяем что это поле с атрибутом name или его дочерние элементы (value, _text)
        if (lowerPath.includes('.@name') || 
            lowerPath.includes('.name') ||
            lowerPath.match(/param\[\d+\]\.value/) ||
            lowerPath.match(/param\[\d+\]\._text/) ||
            (lowerPath.endsWith(']') && !lowerPath.includes('.@')) ||
            lowerPath.match(new RegExp(paramPathLower + '\\[\\d+\\]$')) ||
            lowerPath.includes('.@paramcode') ||
            lowerPath.includes('.@valuecode') ||
            lowerPath.includes('.@lang')) {
          return 'Характеристики товару';
        }
      }
      
      // Параметри товару - ВСЕ остальное что касается товара (price, category, name, description, picture и т.д.)
      if (hasProductPath) {
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
            // Проверяем есть ли @lang атрибут - это может быть <name lang="ru"> и <name lang="ua">
            const hasLangAttr = value.some((item: any) => item['@lang'] !== undefined);
            
            if (hasLangAttr) {
              // Обрабатываем каждый элемент с lang как отдельное поле
              value.forEach((item: any) => {
                const lang = item['@lang'];
                const langSuffix = lang ? `_${lang}` : '';
                const pathWithLang = `${fieldPath}${langSuffix}`;
                
                // Добавляем атрибуты кроме @lang
                Object.entries(item).forEach(([attrKey, attrValue]) => {
                  if (attrKey.startsWith('@') && attrKey !== '@lang') {
                    fields.push({
                      path: `${pathWithLang}.${attrKey}`,
                      type: this.detectType(attrValue),
                      required: false,
                      sample: this.getSample(attrValue),
                      category: getCategory(`${pathWithLang}.${attrKey}`),
                      order: orderCounter++
                    });
                  }
                });
                
                // Добавляем текстовое значение
                if (item._text !== undefined) {
                  fields.push({
                    path: pathWithLang,
                    type: this.detectType(item._text),
                    required: false,
                    sample: this.getSample(item._text),
                    category: getCategory(pathWithLang),
                    order: orderCounter++
                  });
                } else if (typeof item === 'string') {
                  fields.push({
                    path: pathWithLang,
                    type: 'string',
                    required: false,
                    sample: this.getSample(item),
                    category: getCategory(pathWithLang),
                    order: orderCounter++
                  });
                }
              });
            } else {
              // Массив объектов без lang - обрабатываем каждый элемент
              value.forEach((item: any, index: number) => {
                traverse(item, `${fieldPath}[${index}]`, depth + 1);
              });
            }
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
              // Приоритет для характеристик: @name, @paramcode, @valuecode, @lang, остальные
              const priority: Record<string, number> = {
                '@name': 1,
                '@paramcode': 2,
                '@valuecode': 3,
                '@lang': 4,
                '@id': 1,
                '@code': 2
              };
              
              const aPriority = priority[a[0]] || 99;
              const bPriority = priority[b[0]] || 99;
              
              if (aPriority !== bPriority) {
                return aPriority - bPriority;
              }
              
              return a[0].localeCompare(b[0]);
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
