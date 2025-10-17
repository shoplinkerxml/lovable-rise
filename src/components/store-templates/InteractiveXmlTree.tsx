import React from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
  DollarSign,
  Hash,
  Tag,
  FileText,
  List,
  Save,
  X,
  Pencil,
  Type,
  CheckCircle2,
  Image,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { XMLStructure, XMLField } from '@/lib/xml-template-service';

interface TreeNode {
  id: string;
  name: string;
  value?: string;
  type: 'category' | 'field';
  category?: string;
  children?: TreeNode[];
  fieldData?: XMLField;
  isExpanded?: boolean;
}

interface InteractiveXmlTreeProps {
  structure: XMLStructure;
  onSave?: (structure: XMLStructure) => void;
}

// Отдельный компонент для узла дерева с сортировкой
function SortableTreeNode({
  node,
  level,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  parentCategory
}: {
  node: TreeNode;
  level: number;
  onToggle: (id: string) => void;
  onEdit: (id: string, name: string, value: string) => void;
  onDelete: (id: string) => void;
  onAdd: (categoryName: string) => void;
  parentCategory?: string;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(node.name);
  const [editValue, setEditValue] = React.useState(node.value || '');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    disabled: node.type === 'category', // Категории не перетаскиваем
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    onEdit(node.id, editName, editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(node.name);
    setEditValue(node.value || '');
    setIsEditing(false);
  };

  const getIcon = (node: TreeNode) => {
    const iconClass = "h-3.5 w-3.5 text-primary";
    
    const path = node.fieldData?.path?.toLowerCase() || node.name.toLowerCase();
    
    // Атрибуты
    if (path.startsWith('@') || node.name.startsWith('@')) {
      return <Tag className={iconClass} />;
    }
    // ID поля
    if (path.includes('id')) {
      return <Hash className={iconClass} />;
    }
    // Цены
    if (path.includes('price') || path.includes('cost') || path.includes('rate')) {
      return <DollarSign className={iconClass} />;
    }
    // Изображения
    if (path.includes('image') || path.includes('picture') || path.includes('photo')) {
      return <Image className={iconClass} />;
    }
    // Наличие
    if (path.includes('available') || path.includes('stock')) {
      return <CheckCircle2 className={iconClass} />;
    }
    // Названия
    if (path.includes('name') || path.includes('title')) {
      return <Type className={iconClass} />;
    }
    // Товары
    if (path.includes('product') || path.includes('item') || path.includes('offer')) {
      return <Package className={iconClass} />;
    }
    // Валюты
    if (path.includes('currency')) {
      return <DollarSign className={iconClass} />;
    }
    // Категории
    if (path.includes('categor')) {
      return <List className={iconClass} />;
    }
    // Описания
    if (path.includes('description')) {
      return <FileText className={iconClass} />;
    }
    // URL
    if (path.includes('url') || path.includes('link')) {
      return <Tag className={iconClass} />;
    }
    
    return <FileText className={iconClass} />;
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded cursor-pointer group"
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={() => node.children && node.children.length > 0 && onToggle(node.id)}
      >
        {/* Expand/Collapse */}
        {node.children && node.children.length > 0 && (
          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {node.isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
        {!(node.children && node.children.length > 0) && <div className="w-4 flex-shrink-0" />}

        {/* Icon */}
        <div className="flex-shrink-0">
          {getIcon(node)}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-6 text-xs flex-1 font-mono px-1"
              placeholder="Назва"
            />
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-6 text-xs flex-1 font-mono px-1"
              placeholder="Значення"
            />
            <Button size="sm" variant="default" onClick={handleSave} className="h-6 w-6 p-0 flex-shrink-0" title="Зберегти">
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-6 w-6 p-0 flex-shrink-0" title="Скасувати">
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <span className="font-mono text-sm font-medium text-foreground flex-shrink-0">{node.name}</span>
            {node.value && (
              <>
                <span className="text-muted-foreground flex-shrink-0">:</span>
                <span className="font-mono text-sm text-muted-foreground truncate">{node.value}</span>
              </>
            )}

            {/* Actions - всегда видны */}
            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex-shrink-0">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0 flex-shrink-0"
                title="Редагувати"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(node.id)}
                className="h-6 w-6 p-0 text-destructive flex-shrink-0"
                title="Видалити"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Children */}
      {node.isExpanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <SortableTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAdd={onAdd}
              parentCategory={node.type === 'category' ? node.name : parentCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function InteractiveXmlTree({ structure, onSave }: InteractiveXmlTreeProps) {
  // Построение дерева ТОЧНО КАК В XmlPreviewViewer
  const buildTreeFromStructure = React.useCallback((structure: XMLStructure): TreeNode[] => {
    // Создаем объект из полей для парсинга
    const buildObject = (fields: XMLField[]) => {
      const obj: any = {};
      
      fields.forEach(field => {
        const parts = field.path.split('.');
        let current = obj;
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isLast = i === parts.length - 1;
          
          // Проверка на массив
          const arrayMatch = part.match(/(.+)\[(\d+)\]/);
          if (arrayMatch) {
            const [, name, index] = arrayMatch;
            const idx = parseInt(index);
            
            if (!current[name]) current[name] = [];
            if (!current[name][idx]) current[name][idx] = {};
            
            if (isLast) {
              // Атрибут или текст
              if (parts[parts.length - 1].startsWith('@')) {
                current[name][idx][parts[parts.length - 1]] = field.sample;
              } else if (parts[parts.length - 1] === '_text') {
                current[name][idx]._text = field.sample;
              } else {
                current[name][idx] = field.sample;
              }
            } else {
              current = current[name][idx];
            }
          } else {
            if (isLast) {
              current[part] = field.sample;
            } else {
              if (!current[part]) current[part] = {};
              current = current[part];
            }
          }
        }
      });
      
      return obj;
    };
    
    const obj = buildObject(structure.fields);
    
    // Теперь строим дерево ТОЧНО как в XmlPreviewViewer
    const buildTree = (obj: any, parentPath = ''): TreeNode[] => {
      const nodes: TreeNode[] = [];
      let textValue: string | null = null;
      let nodeId = 0;

      // Сначала собираем текстовое значение если есть
      if (obj._text !== undefined) {
        textValue = String(obj._text);
      }

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = parentPath ? `${parentPath}-${key}` : key;
        
        if (key.startsWith('@')) {
          // Атрибут
          nodes.push({
            id: `${currentPath}-${nodeId++}`,
            name: key.substring(1),
            value: String(value),
            type: 'field'
          });
        } else if (key === '_text') {
          // Пропускаем _text, он будет добавлен в конце
          continue;
        } else if (Array.isArray(value)) {
          // Массив - каждый элемент отдельно!
          const children: TreeNode[] = [];
          value.forEach((item, idx) => {
            if (typeof item === 'object') {
              children.push({
                id: `${currentPath}-${idx}-${nodeId++}`,
                name: `${key}[${idx}]`,
                children: buildTree(item, `${currentPath}-${idx}`),
                type: 'field',
                isExpanded: true
              });
            } else {
              children.push({
                id: `${currentPath}-${idx}-${nodeId++}`,
                name: `${key}[${idx}]`,
                value: String(item),
                type: 'field'
              });
            }
          });
          nodes.push({
            id: `${currentPath}-${nodeId++}`,
            name: key,
            children,
            type: 'field',
            isExpanded: true
          });
        } else if (typeof value === 'object' && value !== null) {
          // Объект
          nodes.push({
            id: `${currentPath}-${nodeId++}`,
            name: key,
            children: buildTree(value, currentPath),
            type: 'field',
            isExpanded: true
          });
        } else {
          // Простое значение
          nodes.push({
            id: `${currentPath}-${nodeId++}`,
            name: key,
            value: String(value),
            type: 'field'
          });
        }
      }

      // Добавляем текстовое значение в конце как "value"
      if (textValue !== null && nodes.length > 0) {
        nodes.push({
          id: `${parentPath}-value-${nodeId++}`,
          name: 'value',
          value: textValue,
          type: 'field'
        });
      }

      return nodes;
    };
    
    return buildTree(obj);
  }, []);

  const [treeData, setTreeData] = React.useState<TreeNode[]>(() => 
    buildTreeFromStructure(structure)
  );

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const handleToggle = (id: string) => {
    setTreeData(prev => {
      const toggle = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.id === id) {
            return { ...node, isExpanded: !node.isExpanded };
          }
          if (node.children) {
            return { ...node, children: toggle(node.children) };
          }
          return node;
        });
      };
      return toggle(prev);
    });
  };

  const handleEdit = (id: string, name: string, value: string) => {
    setTreeData(prev => {
      const edit = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.id === id) {
            return { ...node, name, value };
          }
          if (node.children) {
            return { ...node, children: edit(node.children) };
          }
          return node;
        });
      };
      return edit(prev);
    });
    toast.success('Зміни збережено локально');
  };

  const handleDelete = (id: string) => {
    setTreeData(prev => {
      const deleteNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes
          .filter(node => node.id !== id)
          .map(node => ({
            ...node,
            children: node.children ? deleteNode(node.children) : undefined
          }));
      };
      return deleteNode(prev);
    });
    toast.success('Поле видалено');
  };

  const handleAdd = (categoryName: string) => {
    setTreeData(prev => {
      const timestamp = Date.now();
      
      const addToCategory = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.type === 'category' && node.name === categoryName) {
            const newField: TreeNode = {
              id: `field-${categoryName}-${timestamp}`,
              name: 'нове_поле',
              value: '',
              type: 'field',
              category: categoryName,
              fieldData: {
                path: `${categoryName.toLowerCase()}.new_field`,
                type: 'string',
                required: false,
                sample: '',
                category: categoryName,
                order: node.children?.length || 0
              }
            };
            
            return {
              ...node,
              children: [...(node.children || []), newField]
            };
          }
          if (node.children) {
            return { ...node, children: addToCategory(node.children) };
          }
          return node;
        });
      };
      
      return addToCategory(prev);
    });
    toast.success('Поле додано');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setTreeData(prev => {
      const reorder = (nodes: TreeNode[]): TreeNode[] => {
        // Находим категорию с элементами для сортировки
        return nodes.map(node => {
          if (node.children) {
            const oldIndex = node.children.findIndex(c => c.id === active.id);
            const newIndex = node.children.findIndex(c => c.id === over.id);
            
            if (oldIndex !== -1 && newIndex !== -1) {
              return {
                ...node,
                children: arrayMove(node.children, oldIndex, newIndex)
              };
            }
            
            return { ...node, children: reorder(node.children) };
          }
          return node;
        });
      };
      return reorder(prev);
    });
  };

  const handleSaveAll = () => {
    // Преобразуем дерево обратно в XMLStructure
    const fields: XMLField[] = [];
    
    const extractFields = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'field' && node.fieldData) {
          // Обновляем sample из текущих значений
          const updatedField = {
            ...node.fieldData,
            sample: node.value
          };
          
          // Для валют и характеристик нужно обновить связанные поля
          if (node.category === 'Валюти' && node.fieldData.path.includes('@id')) {
            fields.push({ ...updatedField, sample: node.name }); // @id поле
            const ratePath = node.fieldData.path.replace('@id', '@rate');
            fields.push({
              path: ratePath,
              type: 'string',
              required: false,
              sample: node.value,
              category: node.category,
              order: updatedField.order! + 1
            });
          } else if (node.category === 'Характеристики товару' && node.fieldData.path.includes('@name')) {
            fields.push({ ...updatedField, sample: node.name }); // @name поле
            const basePath = node.fieldData.path.replace('.@name', '');
            fields.push({
              path: basePath + '._text',
              type: 'string',
              required: false,
              sample: node.value,
              category: node.category,
              order: updatedField.order! + 1
            });
          } else {
            // Обычное поле - обновляем path если изменилось имя
            const pathParts = updatedField.path.split('.');
            pathParts[pathParts.length - 1] = node.name;
            fields.push({
              ...updatedField,
              path: pathParts.join('.'),
              sample: node.value
            });
          }
        }
        
        if (node.children) {
          extractFields(node.children);
        }
      });
    };
    
    extractFields(treeData);
    
    const updatedStructure: XMLStructure = {
      ...structure,
      fields
    };
    
    if (onSave) {
      onSave(updatedStructure);
      toast.success('Всі зміни збережено!');
    }
  };

  // Получаем все ID для DnD контекста
  const getAllIds = (nodes: TreeNode[]): string[] => {
    const ids: string[] = [];
    nodes.forEach(node => {
      ids.push(node.id);
      if (node.children) {
        ids.push(...getAllIds(node.children));
      }
    });
    return ids;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Save button */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <h2 className="text-lg font-semibold">Структура XML</h2>
        <Button onClick={handleSaveAll} className="gap-2" title="Зберегти всі зміни">
          <Save className="h-4 w-4" />
        </Button>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="bg-card border rounded-lg">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={getAllIds(treeData)}
                strategy={verticalListSortingStrategy}
              >
                {treeData.map((node) => (
                  <SortableTreeNode
                    key={node.id}
                    node={node}
                    level={0}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAdd={handleAdd}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
