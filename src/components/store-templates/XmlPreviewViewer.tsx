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
        parseTagValue: true,
      });

      const parsed = parser.parse(xml);
      const tree = buildTree(parsed);
      setTreeData(tree);
      
      // Разворачиваем все узлы по умолчанию
      const allExpanded = new Set<string>();
      const expandAll = (nodes: TreeNode[], prefix = '') => {
        nodes.forEach((node, idx) => {
          const path = prefix ? `${prefix}-${idx}` : String(idx);
          if (node.children && node.children.length > 0) {
            allExpanded.add(path);
            expandAll(node.children, path);
          }
        });
      };
      expandAll(tree);
      setExpanded(allExpanded);
    } catch (error) {
      console.error('Error parsing XML:', error);
    }
  };

  const buildTree = (obj: any, parentPath = ''): TreeNode[] => {
    const nodes: TreeNode[] = [];
    let textValue: string | null = null;

    // Сначала собираем текстовое значение если есть
    if (obj._text !== undefined) {
      textValue = truncateValue(String(obj._text));
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('@')) {
        // Атрибут
        nodes.push({
          name: key.substring(1),
          value: truncateValue(String(value)),
          type: 'attribute'
        });
      } else if (key === '_text') {
        // Пропускаем _text, он будет добавлен в конце
        continue;
      } else if (Array.isArray(value)) {
        // Массив
        const children: TreeNode[] = [];
        value.forEach((item, idx) => {
          if (typeof item === 'object') {
            children.push({
              name: `${key}[${idx}]`,
              children: buildTree(item),
              type: 'element'
            });
          } else {
            children.push({
              name: `${key}[${idx}]`,
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
        // Объект
        nodes.push({
          name: key,
          children: buildTree(value),
          type: 'element'
        });
      } else {
        // Простое значение
        nodes.push({
          name: key,
          value: truncateValue(String(value)),
          type: 'text'
        });
      }
    }

    // Добавляем текстовое значение в конце, но без отображения "#text:"
    if (textValue !== null && nodes.length > 0) {
      // Если есть атрибуты, добавляем текст как последний элемент с именем "value"
      nodes.push({
        name: 'value',
        value: textValue,
        type: 'text'
      });
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
            <div className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
          {!hasChildren && <div className="w-4" />}
          
          <div className="flex-shrink-0">
            {getIcon(node)}
          </div>
          
          <span className="font-mono text-sm font-medium text-foreground">
            {node.name}
          </span>
          
          {node.value && (
            <>
              <span className="text-muted-foreground">:</span>
              <span className="font-mono text-sm text-muted-foreground truncate">
                {node.value}
              </span>
            </>
          )}
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
