import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Hash, 
  Type, 
  DollarSign, 
  CheckCircle2, 
  Image, 
  Tag,
  List,
  Package,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { XMLParser } from 'fast-xml-parser';

interface XmlPreviewViewerProps {
  xmlContent: string;
  className?: string;
}

interface TreeNode {
  name: string;
  value?: string;
  children?: TreeNode[];
  type: 'element' | 'attribute' | 'text' | 'array';
  icon?: string;
}

export const XmlPreviewViewer = ({ xmlContent, className = '' }: XmlPreviewViewerProps) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (xmlContent) {
      parseXmlToTree(xmlContent);
    }
  }, [xmlContent]);

  const parseXmlToTree = (xml: string) => {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@',
        textNodeName: '_text',
        parseAttributeValue: true,
        parseTagValue: true
      });

      const parsed = parser.parse(xml);
      console.log('[XmlPreviewViewer] Parsed XML:', parsed);
      console.log('[XmlPreviewViewer] Keys:', Object.keys(parsed));
      const tree = buildTree(parsed);
      console.log('[XmlPreviewViewer] Built tree:', tree);
      console.log('[XmlPreviewViewer] Tree length:', tree.length);
      if (tree.length > 0 && tree[0].children) {
        console.log('[XmlPreviewViewer] First node children:', tree[0].children.length);
        console.log('[XmlPreviewViewer] First child:', tree[0].children[0]);
      }
      setTreeData(tree);
      
      // Разворачиваем все узлы по умолчанию
      const allExpanded = new Set<string>();
      const expandAll = (nodes: TreeNode[], prefix = '') => {
        nodes.forEach((node, idx) => {
          const path = prefix ? `${prefix}-${idx}` : String(idx);
          allExpanded.add(path);
          console.log('[expandAll] Added path:', path, 'children:', node.children?.length || 0);
          if (node.children && node.children.length > 0) {
            expandAll(node.children, path);
          }
        });
      };
      expandAll(tree);
      console.log('[XmlPreviewViewer] Total expanded paths:', allExpanded.size);
      setExpanded(allExpanded);
    } catch (error) {
      console.error('Error parsing XML:', error);
    }
  };

  const buildTree = (obj: any, parentPath = '', parentName = ''): TreeNode[] => {
    const nodes: TreeNode[] = [];
    let textValue: string | null = null;

    if (obj._text !== undefined) {
      textValue = truncateValue(String(obj._text));
    }

    // Спочатку збираємо атрибути (@date, @version, @id і т.д.), потім інші
    const attributes: [string, any][] = [];
    const others: [string, any][] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('@')) {
        attributes.push([key, value]);
      } else if (key !== '_text') {
        others.push([key, value]);
      }
    }
    
    // Для param - показываем в формате: @name → _text → @paramid → @valueid
    const isParam = parentName === 'param';
    
    if (isParam) {
      // Специальная обработка для param
      const nameAttr = attributes.find(([k]) => k === '@name');
      const paramidAttr = attributes.find(([k]) => k === '@paramid');
      const valueidAttr = attributes.find(([k]) => k === '@valueid');
      const valueField = others.find(([k]) => k === 'value');
      
      // 1. Название характеристики (@name)
      if (nameAttr) {
        nodes.push({
          name: '@name',
          value: truncateValue(String(nameAttr[1])),
          type: 'attribute'
        });
      }
      
      // 2. Значение (_text или value)
      if (textValue !== null) {
        nodes.push({
          name: 'value',
          value: textValue,
          type: 'text'
        });
      } else if (valueField) {
        const [, val] = valueField;
        if (typeof val === 'object' && val !== null) {
          nodes.push({
            name: 'value',
            children: buildTree(val, `${parentPath}.value`, 'value'),
            type: 'element'
          });
        } else {
          nodes.push({
            name: 'value',
            value: truncateValue(String(val)),
            type: 'text'
          });
        }
      }
      
      // 3. ID параметра (@paramid)
      if (paramidAttr) {
        nodes.push({
          name: '@paramid',
          value: truncateValue(String(paramidAttr[1])),
          type: 'attribute'
        });
      }
      
      // 4. ID значения (@valueid)
      if (valueidAttr) {
        nodes.push({
          name: '@valueid',
          value: truncateValue(String(valueidAttr[1])),
          type: 'attribute'
        });
      }
      
      // Обработка остальных атрибутов и полей
      for (const [key, value] of attributes) {
        if (!['@name', '@paramid', '@valueid'].includes(key)) {
          nodes.push({
            name: key,
            value: truncateValue(String(value)),
            type: 'attribute'
          });
        }
      }
      
      for (const [key, value] of others) {
        if (key !== 'value') {
          const currentPath = `${parentPath}.${key}`;
          
          if (Array.isArray(value)) {
            const children: TreeNode[] = [];
            value.forEach((item, idx) => {
              if (typeof item === 'object') {
                children.push({
                  name: key,
                  children: buildTree(item, `${currentPath}[${idx}]`, key),
                  type: 'element'
                });
              } else {
                children.push({
                  name: key,
                  value: truncateValue(String(item)),
                  type: 'text'
                });
              }
            });
            nodes.push({
              name: key,
              children,
              type: 'array'
            });
          } else if (typeof value === 'object' && value !== null) {
            nodes.push({
              name: key,
              children: buildTree(value, currentPath, key),
              type: 'element'
            });
          } else {
            nodes.push({
              name: key,
              value: truncateValue(String(value)),
              type: 'text'
            });
          }
        }
      }
    } else {
      // Обычная обработка для не-param элементов
      // Обрабатываем атрибуты ПЕРВЫМИ
      for (const [key, value] of attributes) {
        nodes.push({
          name: key,
          value: truncateValue(String(value)),
          type: 'attribute'
        });
      }
      
      // Потом обрабатываем остальные поля
      for (const [key, value] of others) {
        const currentPath = parentPath ? `${parentPath}.${key}` : key;
        
        if (key.startsWith('@')) {
          nodes.push({
            name: key.substring(1),
            value: truncateValue(String(value)),
            type: 'attribute'
          });
        } else if (key === '_text') {
          continue;
        } else if (Array.isArray(value)) {
          // МАСИВ - РОЗГОРТАЄМО ВСІ ЕЛЕМЕНТИ НАПРЯМУ
          if (key === 'param') {
            // Кожен param окремо
            value.forEach((item, idx) => {
              if (typeof item === 'object') {
                nodes.push({
                  name: 'param',
                  children: buildTree(item, `${currentPath}[${idx}]`, 'param'),
                  type: 'element'
                });
              } else {
                nodes.push({
                  name: 'param',
                  value: truncateValue(String(item)),
                  type: 'text'
                });
              }
            });
          } else {
            // Всі інші масиви - кожен елемент як окремий вузол
            value.forEach((item, idx) => {
              if (typeof item === 'object') {
                nodes.push({
                  name: key,
                  children: buildTree(item, `${currentPath}[${idx}]`, key),
                  type: 'element'
                });
              } else {
                nodes.push({
                  name: key,
                  value: truncateValue(String(item)),
                  type: 'text'
                });
              }
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          nodes.push({
            name: key,
            children: buildTree(value, currentPath, key),
            type: 'element'
          });
        } else {
          nodes.push({
            name: key,
            value: truncateValue(String(value)),
            type: 'text'
          });
        }
      }

      if (textValue !== null && nodes.length > 0) {
        nodes.push({
          name: 'value',
          value: textValue,
          type: 'text'
        });
      }
    }

    return nodes;
  };

  const truncateValue = (value: string, maxLength = 50): string => {
    if (value.length > maxLength) {
      return value.substring(0, maxLength) + '...';
    }
    return value;
  };

  const getIcon = (node: TreeNode) => {
    const iconClass = 'h-4 w-4 text-primary';
    
    if (node.type === 'attribute') {
      return <Tag className={iconClass} />;
    }
    if (node.type === 'array') {
      return <List className={iconClass} />;
    }
    if (node.name.toLowerCase().includes('id')) {
      return <Hash className={iconClass} />;
    }
    if (node.name.toLowerCase().includes('price') || node.name.toLowerCase().includes('cost')) {
      return <DollarSign className={iconClass} />;
    }
    if (node.name.toLowerCase().includes('image') || node.name.toLowerCase().includes('picture')) {
      return <Image className={iconClass} />;
    }
    if (node.name.toLowerCase().includes('available') || node.name.toLowerCase().includes('stock')) {
      return <CheckCircle2 className={iconClass} />;
    }
    if (node.name.toLowerCase().includes('name') || node.name.toLowerCase().includes('title')) {
      return <Type className={iconClass} />;
    }
    if (node.name.toLowerCase().includes('product') || node.name.toLowerCase().includes('item') || node.name.toLowerCase().includes('offer')) {
      return <Package className={iconClass} />;
    }
    
    return <FileText className={iconClass} />;
  };

  const toggleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: TreeNode, path: string, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(path);
    const indent = level * 20;

    return (
      <div key={path}>
        <div 
          className={`flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded cursor-pointer group`}
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => hasChildren && toggleExpand(path)}
        >
          {hasChildren && (
            <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
          {!hasChildren && <div className="w-4 flex-shrink-0" />}
          
          <div className="flex-shrink-0">
            {getIcon(node)}
          </div>
          
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <span className="font-mono text-sm font-medium text-foreground flex-shrink-0">{node.name}</span>
            {node.value && !node.children && (
              <>
                <span className="text-muted-foreground flex-shrink-0">:</span>
                <span className="font-mono text-sm text-muted-foreground inline-block truncate max-w-[400px]" title={node.value}>{node.value}</span>
              </>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child, idx) => 
              renderNode(child, `${path}-${idx}`, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`bg-card border-border overflow-hidden ${className}`}>
      <ScrollArea className="h-full w-full">
        <div className="p-4">
          {treeData.length > 0 ? (
            treeData.map((node, idx) => renderNode(node, String(idx)))
          ) : (
            <div className="text-muted-foreground text-sm">
              Завантаження...
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
