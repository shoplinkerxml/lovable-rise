import * as React from "react"
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  GripVerticalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { XMLField } from "@/lib/xml-template-service"

interface EditableRow extends XMLField {
  id: number;
}

// Create a separate component for the drag handle
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent cursor-grab active:cursor-grabbing"
    >
      <GripVerticalIcon className="size-4 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

interface EditableXMLTableProps {
  category: string;
  fields: XMLField[];
  onFieldsChange: (fields: XMLField[]) => void;
}

function DraggableRow({ 
  row, 
  onUpdate, 
  onDelete 
}: { 
  row: Row<EditableRow>; 
  onUpdate: (id: number, field: Partial<EditableRow>) => void;
  onDelete: (id: number) => void;
}) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  const [isEditing, setIsEditing] = React.useState(false);
  const [editedPath, setEditedPath] = React.useState(row.original.path);
  const [editedSample, setEditedSample] = React.useState(row.original.sample || '');

  const handleSave = () => {
    onUpdate(row.original.id, {
      path: editedPath,
      sample: editedSample
    });
    setIsEditing(false);
    toast.success('Поле оновлено');
  };

  const handleCancel = () => {
    setEditedPath(row.original.path);
    setEditedSample(row.original.sample || '');
    setIsEditing(false);
  };

  // Получить короткое имя (последние 2 сегмента пути)
  const getShortName = (path: string) => {
    const parts = path.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return path;
  };

  return (
    <TableRow
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      <TableCell className="w-12">
        <DragHandle id={row.original.id} />
      </TableCell>
      <TableCell className="font-mono text-sm">
        {isEditing ? (
          <Input
            value={editedPath}
            onChange={(e) => setEditedPath(e.target.value)}
            className="h-8 text-sm"
          />
        ) : (
          <span onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted px-2 py-1 rounded">
            {getShortName(row.original.path)}
          </span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {isEditing ? (
          <Input
            value={editedSample}
            onChange={(e) => setEditedSample(e.target.value)}
            className="h-8 text-sm"
          />
        ) : (
          <span onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted px-2 py-1 rounded">
            {row.original.sample || '-'}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {isEditing ? (
          <div className="flex items-center gap-1 justify-end">
            <Button
              size="sm"
              variant="default"
              onClick={handleSave}
              className="h-7 px-2"
            >
              Зберегти
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-7 px-2"
            >
              Скасувати
            </Button>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                Дії
                <ChevronDownIcon className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                Редагувати
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(row.original.id)}
                className="text-destructive"
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                Видалити
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  )
}

export function EditableXMLTable({ category, fields, onFieldsChange }: EditableXMLTableProps) {
  // Преобразуем fields в EditableRow с уникальными id
  const [data, setData] = React.useState<EditableRow[]>(() => 
    fields.map((field, index) => ({
      ...field,
      id: Date.now() + index
    }))
  );

  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data]
  );

  const columns: ColumnDef<EditableRow>[] = [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => null,
    },
    {
      id: "path",
      header: "Поле",
      cell: ({ row }) => null,
    },
    {
      id: "sample",
      header: "Значення",
      cell: ({ row }) => null,
    },
    {
      id: "actions",
      header: "Дії",
      cell: ({ row }) => null,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id.toString(),
    getCoreRowModel: getCoreRowModel(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        const newData = arrayMove(data, oldIndex, newIndex);
        // Оповестить родителя об изменении
        onFieldsChange(newData.map(({ id, ...field }) => field));
        return newData;
      });
    }
  }

  const handleUpdate = (id: number, updates: Partial<EditableRow>) => {
    setData((prev) => {
      const newData = prev.map(row => 
        row.id === id ? { ...row, ...updates } : row
      );
      onFieldsChange(newData.map(({ id, ...field }) => field));
      return newData;
    });
  };

  const handleDelete = (id: number) => {
    setData((prev) => {
      const newData = prev.filter(row => row.id !== id);
      onFieldsChange(newData.map(({ id, ...field }) => field));
      toast.success('Поле видалено');
      return newData;
    });
  };

  const handleAddField = () => {
    const newField: EditableRow = {
      id: Date.now(),
      path: `${category.toLowerCase()}.new_field`,
      type: 'string',
      required: false,
      sample: '',
      category: category,
      order: data.length
    };
    
    setData((prev) => {
      const newData = [...prev, newField];
      onFieldsChange(newData.map(({ id, ...field }) => field));
      toast.success('Поле додано');
      return newData;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{category}</CardTitle>
        <Button
          onClick={handleAddField}
          size="sm"
          variant="outline"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Додати поле
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow 
                        key={row.id} 
                        row={row} 
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      Немає полів
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </CardContent>
    </Card>
  );
}
