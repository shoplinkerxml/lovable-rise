import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export interface XMLStructure {
  root: string;
  fields: XMLField[];
  namespaces?: Record<string, string>;
  originalXml?: string;
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
export type XMLFormatType = 'rozetka' | 'epicentr' | 'prom' | 'price' | 'mma' | 'google_shopping' | 'custom' | 'unknown';

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
      removeNSPrefix: true, // Убираем namespace префиксы (g: для Google Shopping)
      isArray: (name, jpath) => {
        // Универсальное определение массивов
        // YML формат
        if (['currencies.currency', 'categories.category', 'offers.offer', 'offer.picture', 'offer.param'].includes(jpath)) {
          return true;
        }
        // Google Shopping RSS
        if (jpath === 'rss.channel.item' || jpath === 'channel.item') {
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
    
    // Google Shopping формат (RSS с namespace g: и элементами типа g:id, g:price)
    if (data.rss && data.rss.channel && data.rss.channel.item) {
      const firstItem = Array.isArray(data.rss.channel.item) ? data.rss.channel.item[0] : data.rss.channel.item;
      // Проверяем наличие Google Shopping специфичных полей
      if (firstItem && (firstItem['g:id'] || firstItem['g:link'] || firstItem['g:price'])) {
        return {
          type: 'google_shopping',
          productPath: 'channel.item',
          categoryPath: '',
          paramPath: ''
        };
      }
    }
    
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
    formatType: 'rozetka' | 'epicentr' | 'prom' | 'price' | 'mma' | 'google_shopping' | 'custom';
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
    structure.originalXml = xmlContent; // Сохраняем оригинальный XML
    
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
      // Убираем индексы массивов для правильного определения категории
      const lowerPath = fieldPath.toLowerCase().replace(/\[\d+\]/g, '');
      const format = this.detectedFormat;
      
      if (!format) return 'Інше';
      
      const pathParts = lowerPath.split('.');
      
      // Google Shopping формат
      if (format.type === 'google_shopping') {
        // Основна інформація channel (не item)
        if (lowerPath.match(/^(rss\.)?channel\.(title|link|description)$/)) {
          return 'Основна інформація';
        }
        
        // Параметри товару - все поля внутри item
        if (lowerPath.includes('channel.item')) {
          return 'Параметри товару';
        }
        
        return 'Інше';
      }
      
      // Проверяем есть ли в пути секция товаров
      let hasProductPath = false;
      if (format.productPath) {
        const productPathParts = format.productPath.toLowerCase().split('.');
        // Проверяем что ВСЕ части productPath присутствуют в пути в правильном порядке
        let foundIndex = -1;
        let allFound = true;
        for (const part of productPathParts) {
          const index = pathParts.indexOf(part, foundIndex + 1);
          if (index === -1) {
            allFound = false;
            break;
          }
          foundIndex = index;
        }
        hasProductPath = allFound && foundIndex !== -1;
      }
      
      // Проверяем есть ли в пути секция категорий
      let hasCategoryPath = false;
      if (format.categoryPath) {
        const categoryPathParts = format.categoryPath.toLowerCase().split('.');
        let foundIndex = -1;
        let allFound = true;
        for (const part of categoryPathParts) {
          const index = pathParts.indexOf(part, foundIndex + 1);
          if (index === -1) {
            allFound = false;
            break;
          }
          foundIndex = index;
        }
        hasCategoryPath = allFound && foundIndex !== -1;
      }
      
      // Основна інформація - поля корневого уровня (name, company, url) - БЕЗ атрибутов
      if (!hasProductPath && !hasCategoryPath && !lowerPath.includes('currenc')) {
        const fieldName = pathParts[pathParts.length - 1];
        // Только текстовые поля без @, не атрибуты
        if (fieldName.match(/^(name|company|url|shop_name|store_name)$/)) {
          return 'Основна інформація';
        }
      }
      
      // Категорії
      if (hasCategoryPath && !hasProductPath) {
        return 'Категорії';
      }
      if (!hasProductPath && lowerPath.match(/categor(y|ies)/)) {
        return 'Категорії';
      }
      
      // Валюти
      if (!hasProductPath && lowerPath.match(/currenc(y|ies)/)) {
        return 'Валюти';
      }
      
      // Характеристики товару - param з @name
      if (hasProductPath && format.paramPath) {
        const paramPathLower = format.paramPath.toLowerCase();
        // Проверяем что в пути есть param
        if (lowerPath.match(/\.param\[\d+\]/)) {
          // Если есть @name - это характеристика
          if (lowerPath.includes('.@name') || lowerPath.endsWith('._text')) {
            return 'Характеристики товару';
          }
          // Все остальное в param - параметры
          return 'Параметри товару';
        }
      }
      
      // Параметри товару
      if (hasProductPath) {
        return 'Параметри товару';
      }
      
      return 'Інше';
    };
    
    const traverse = (obj: any, currentPath: string, depth = 0) => {
      if (depth > 10) return;
      
      for (const [key, value] of Object.entries(obj)) {
        // Пропускаем XML declaration атрибуты на корневом уровне
        if (depth === 0 && key.startsWith('@')) {
          continue; // Пропускаем @version, @encoding и другие корневые атрибуты
        }
        
        // Пропускаем атрибут @date на первом уровне вложенности (yml_catalog.@date)
        if (depth === 1 && key === '@date') {
          continue;
        }
        
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
              // Массив объектов без lang - обрабатываем ВСЕ элементы с индексами
              // Для param - специальная обработка с группировкой
              const isParamArray = cleanKey === 'param';
              
              value.forEach((item: any, index: number) => {
                const indexedPath = `${fieldPath}[${index}]`;
                
                if (isParamArray && typeof item === 'object' && item !== null) {
                  // Специальная обработка param: @name → _text → @paramid → @valueid
                  const itemObj = item as Record<string, any>;
                  
                  // 1. @name
                  if (itemObj['@name'] !== undefined) {
                    fields.push({
                      path: `${indexedPath}.@name`,
                      type: this.detectType(itemObj['@name']),
                      required: false,
                      sample: this.getSample(itemObj['@name']),
                      category: getCategory(`${indexedPath}.@name`),
                      order: orderCounter++
                    });
                  }
                  
                  // 2. _text (значение)
                  if (itemObj._text !== undefined) {
                    fields.push({
                      path: `${indexedPath}._text`,
                      type: this.detectType(itemObj._text),
                      required: false,
                      sample: this.getSample(itemObj._text),
                      category: getCategory(`${indexedPath}._text`),
                      order: orderCounter++
                    });
                  }
                  
                  // 3. @paramid
                  if (itemObj['@paramid'] !== undefined) {
                    fields.push({
                      path: `${indexedPath}.@paramid`,
                      type: this.detectType(itemObj['@paramid']),
                      required: false,
                      sample: this.getSample(itemObj['@paramid']),
                      category: getCategory(`${indexedPath}.@paramid`),
                      order: orderCounter++
                    });
                  }
                  
                  // 4. @valueid
                  if (itemObj['@valueid'] !== undefined) {
                    fields.push({
                      path: `${indexedPath}.@valueid`,
                      type: this.detectType(itemObj['@valueid']),
                      required: false,
                      sample: this.getSample(itemObj['@valueid']),
                      category: getCategory(`${indexedPath}.@valueid`),
                      order: orderCounter++
                    });
                  }
                  
                  // 5. Остальные атрибуты и поля
                  for (const [key, val] of Object.entries(itemObj)) {
                    if (!['@name', '@paramid', '@valueid', '_text'].includes(key)) {
                      if (key === 'value' && typeof val === 'object' && val !== null) {
                        // Вложенные <value lang="uk"> и <value lang="ru">
                        traverse(val, `${indexedPath}.value`, depth + 1);
                      } else {
                        fields.push({
                          path: `${indexedPath}.${key}`,
                          type: this.detectType(val),
                          required: false,
                          sample: this.getSample(val),
                          category: getCategory(`${indexedPath}.${key}`),
                          order: orderCounter++
                        });
                      }
                    }
                  }
                } else {
                  // Обычная обработка не-param массивов
                  traverse(item, indexedPath, depth + 1);
                }
              });
            }
          } else {
            // Массив простых значений - добавляем каждый элемент отдельно
            value.forEach((item: any, index: number) => {
              fields.push({
                path: `${fieldPath}[${index}]`,
                type: this.detectType(item),
                required: false,
                sample: this.getSample(item),
                category: getCategory(`${fieldPath}[${index}]`),
                order: orderCounter++
              });
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
      'offer.vendor': 'vendor',
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
  
  // Получить отображаемое название формата
  getFormatDisplayName(formatType: XMLFormatType): string {
    const formatNames: Record<XMLFormatType, string> = {
      'rozetka': 'Rozetka',
      'epicentr': 'Epicentr',
      'prom': 'Prom',
      'price': 'Price',
      'mma': 'MMA',
      'google_shopping': 'Google Shopping',
      'custom': 'Кастомний',
      'unknown': 'Невідомий'
    };
    return formatNames[formatType] || formatType;
  }
  
  // Получить текущий формат
  getDetectedFormat(): XMLFormat | undefined {
    return this.detectedFormat;
  }
}
