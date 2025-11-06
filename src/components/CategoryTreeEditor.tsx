import React, { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useI18n } from "@/providers/i18n-provider";
import { CategoryService, type StoreCategory } from "@/lib/category-service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, MoreVertical, Plus, Pencil, Trash2 } from "lucide-react";

type Supplier = { id: string; supplier_name: string };
type Store = { id: string; store_name: string };

interface CategoryTreeEditorProps {
  suppliers: Supplier[];
  stores: Store[];
  categories: StoreCategory[];
  defaultSupplierId?: string;
  defaultStoreId?: string;
  onCategoryCreated?: (category: StoreCategory) => void;
  showStoreSelect?: boolean;
  onSupplierChange?: (supplierId: string) => void;
}

export const CategoryTreeEditor: React.FC<CategoryTreeEditorProps> = ({
  suppliers,
  stores,
  categories,
  defaultSupplierId,
  defaultStoreId,
  onCategoryCreated,
  showStoreSelect = true,
  onSupplierChange,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [supplierId, setSupplierId] = useState<string>(defaultSupplierId || "");
  const [storeId, setStoreId] = useState<string>(defaultStoreId || "");
  const [search, setSearch] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);

  // Keep internal supplierId in sync with parent-provided defaultSupplierId
  // This ensures the categories query runs when the user selects a supplier outside this component
  React.useEffect(() => {
    const autoDefault = suppliers && suppliers.length > 0 ? suppliers[0].id : "";
    const next = defaultSupplierId || autoDefault || "";
    // Only update when it actually changes to avoid unnecessary re-renders
    setSupplierId(prev => (prev !== next ? next : prev));
    // Propagate default selection to parent to keep formData in sync
    if (next && next !== supplierId) {
      onSupplierChange?.(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSupplierId, suppliers]);

  // Modal state for create/rename
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createParentExternalId, setCreateParentExternalId] = useState<string>("");
  const [createExternalId, setCreateExternalId] = useState<string>("");
  const [createName, setCreateName] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [createExternalError, setCreateExternalError] = useState<string | null>(null);

  // Fetch categories reactively
  const {
    data: catList,
    isLoading,
    isFetching,
  } = useQuery<StoreCategory[]>({
    queryKey: ["categories", supplierId || "none"],
    queryFn: () => CategoryService.listCategories(supplierId),
    enabled: !!supplierId,
    // Use categories from parent only for the currently selected supplier
    initialData: (() => {
      const sid = supplierId;
      if (!sid) return undefined;
      const filtered = (categories as any[]).filter((c) => String((c as any).supplier_id) === String(sid));
      if (!filtered.length) return undefined;
      return filtered.map((c: any) => ({
        external_id: c.external_id,
        name: c.name,
        parent_external_id: c.parent_external_id ?? null,
      } satisfies StoreCategory));
    })(),
    staleTime: 20_000,
  });

  const buildTree = useCallback((items: StoreCategory[]): { id: string; name: string; external_id: string; children: any[] }[] => {
    const byParent: Record<string | "root", StoreCategory[]> = { root: [] };
    for (const it of items) {
      // Treat null, undefined, and empty string as root
      const parent = it.parent_external_id ?? undefined;
      const key = parent && String(parent).trim() !== "" ? (parent as string) : "root";
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(it);
    }
    const mapNode = (it: StoreCategory): any => ({
      id: it.external_id,
      name: it.name,
      external_id: it.external_id,
      children: (byParent[it.external_id] || []).map(mapNode),
    });
    return (byParent.root || []).map(mapNode);
  }, []);

  const treeData = useMemo(() => buildTree(catList || []), [catList, buildTree]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const resetCreateState = () => {
    setCreateParentExternalId("");
    setCreateExternalId("");
    setCreateName("");
    setCreateExternalError(null);
  };

  const handleCreate = async () => {
    if (!supplierId) {
      toast.error(t("select_supplier_error"));
      return;
    }
    if (!createExternalId.trim() || !createName.trim()) {
      toast.error(t("fill_required_fields"));
      return;
    }
    try {
      setCreating(true);
      setCreateExternalError(null);
      const newCat = await CategoryService.createCategory({
        supplier_id: supplierId,
        external_id: createExternalId.trim(),
        name: createName.trim(),
        parent_external_id: createParentExternalId || undefined,
      });
      toast.success(t("category_created"));
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["categories", supplierId || "none"] });
      onCategoryCreated?.(newCat);
      resetCreateState();
      setIsCreateOpen(false);
    } catch (error: any) {
      console.error("Create category error:", error);
      if (error?.code === "23505" && String(error?.message || '').includes("uq_store_categories_supplier_external")) {
        const msg = t("external_id_exists");
        setCreateExternalError(msg);
        toast.error(msg);
      } else {
        toast.error(t("failed_create_category"));
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (externalId: string, newName: string) => {
    if (!supplierId || !newName.trim()) return;
    try {
      await CategoryService.updateName(supplierId, externalId, newName.trim());
      await queryClient.invalidateQueries({ queryKey: ["categories", supplierId || "none"] });
      toast.success(t("btn_update"));
    } catch (err) {
      console.error(err);
      toast.error(t("failed_create_category"));
    }
  };

  const handleDelete = async (externalId: string) => {
    if (!supplierId) return;
    try {
      await CategoryService.deleteCategory(supplierId, externalId);
      await queryClient.invalidateQueries({ queryKey: ["categories", supplierId || "none"] });
      toast.success(t("btn_delete"));
    } catch (err) {
      console.error(err);
      toast.error(t("failed_create_category"));
    }
  };

  // Local component: tree node
  const TreeNode: React.FC<{ node: { id: string; name: string; external_id: string; children: any[] } }> = React.memo(({ node }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isOpen = expanded[node.id] ?? false;
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(node.name);

    const onRenameSubmit = async () => {
      await handleRename(node.external_id, renameValue);
      setIsRenaming(false);
    };

    return (
      <div className="pl-[clamp(0rem,2vw,1rem)]" data-testid={`categoryTree_node_${node.external_id}`}>
        <div
          className={`flex items-center gap-[0.5rem] rounded-md hover:bg-muted px-[0.5rem] py-[0.25rem] cursor-pointer ${selected === node.external_id ? "bg-muted" : ""}`}
          onClick={() => setSelected(node.external_id)}
        >
          {hasChildren ? (
            <Button variant="ghost" size="icon" className="h-[1.5rem] w-[1.5rem]" onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} data-testid={`categoryTree_toggle_${node.external_id}`}>
              {isOpen ? <ChevronDown className="h-[1rem] w-[1rem]" /> : <ChevronRight className="h-[1rem] w-[1rem]" />}
            </Button>
          ) : (
            <span className="w-[1.5rem]" />
          )}

          {isRenaming ? (
            <div className="flex items-center gap-[0.5rem]">
              <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="h-[2rem]" data-testid={`categoryTree_renameInput_${node.external_id}`} />
              <Button size="sm" onClick={(e) => { e.stopPropagation(); onRenameSubmit(); }} data-testid={`categoryTree_renameSave_${node.external_id}`}>{t("btn_update")}</Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsRenaming(false); }} data-testid={`categoryTree_renameCancel_${node.external_id}`}>{t("btn_cancel")}</Button>
            </div>
          ) : (
            <span className="flex-1 truncate" title={node.name}>{node.name}</span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className="inline-flex items-center justify-center gap-[0.25rem] whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-[1.75rem] w-[1.75rem]"
                role="button"
                aria-haspopup="menu"
                onClick={(e) => e.stopPropagation()}
                data-testid={`categoryTree_actions_${node.external_id}`}
                title={t("menu")}
              >
                <MoreVertical className="h-[1rem] w-[1rem]" aria-hidden="true" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsCreateOpen(true); setCreateParentExternalId(node.external_id); }} data-testid={`categoryTree_addSub_${node.external_id}`}>
                <Plus className="h-[1rem] w-[1rem] mr-[0.25rem]" />
                {t("add_subcategory")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }} data-testid={`categoryTree_rename_${node.external_id}`}>
                <Pencil className="h-[1rem] w-[1rem] mr-[0.25rem]" />
                {t("rename_category")}
              </DropdownMenuItem>
              <AlertDialog>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()} data-testid={`categoryTree_delete_${node.external_id}`}>
                  <Trash2 className="h-[1rem] w-[1rem] mr-[0.25rem]" />
                  {t("delete_category")}
                </DropdownMenuItem>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("confirm_delete_category")}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("btn_cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(node.external_id)}>{t("btn_delete")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && isOpen && (
          <div className="mt-[0.25rem] space-y-[0.25rem]">
            {node.children.map((child: any) => (
              <TreeNode key={child.id} node={child} />
            ))}
          </div>
        )}
      </div>
    );
  });

  const filteredTree = useMemo(() => {
    if (!search.trim()) return treeData;
    const term = search.trim().toLowerCase();
    const filterNode = (n: any): any | null => {
      const childMatches = (n.children || []).map(filterNode).filter(Boolean);
      if (n.name.toLowerCase().includes(term) || childMatches.length) {
        return { ...n, children: childMatches };
      }
      return null;
    };
    return treeData.map(filterNode).filter(Boolean) as any[];
  }, [treeData, search]);

  return (
    <Card data-testid="categoryTree_card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base" data-testid="categoryTree_title">{t("categories_title")}</CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetCreateState(); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} data-testid="categoryTree_newButton">
              <Plus className="mr-[0.25rem] h-[1rem] w-[1rem]" /> {t("new_category")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("create_category_modal_title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-[0.75rem]">
              <div className="space-y-[0.25rem]">
                <Label htmlFor="cte_supplier_modal">{t("supplier")}</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger id="cte_supplier_modal" data-testid="categoryTree_supplierSelect">
                    <SelectValue placeholder={t("select_supplier")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.supplier_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-[0.25rem]">
                <Label htmlFor="cte_parent_modal">{t("parent_category")}</Label>
                <Select value={createParentExternalId} onValueChange={setCreateParentExternalId}>
                  <SelectTrigger id="cte_parent_modal" data-testid="categoryTree_parentSelect">
                    <SelectValue placeholder={t("select_parent_category")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(catList || []).map((cat) => (
                      <SelectItem key={cat.external_id} value={cat.external_id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-[0.25rem]">
                <Label htmlFor="cte_external_modal">{t("external_id")}</Label>
                <Input
                  id="cte_external_modal"
                  value={createExternalId}
                  onChange={(e) => { setCreateExternalId(e.target.value); if (createExternalError) setCreateExternalError(null); }}
                  placeholder={t("external_id_placeholder")}
                  aria-invalid={Boolean(createExternalError)}
                  className={`h-[2rem] ${createExternalError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  data-testid="categoryTree_externalIdInput"
                />
                {createExternalError && (
                  <p className="text-sm text-destructive" data-testid="categoryTree_externalIdError" aria-live="polite">
                    {createExternalError}
                  </p>
                )}
              </div>
              <div className="space-y-[0.25rem]">
                <Label htmlFor="cte_name_modal">{t("category_name")}</Label>
                <Input id="cte_name_modal" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={t("category_name_placeholder")} data-testid="categoryTree_nameInput" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>{t("btn_cancel")}</Button>
              <Button onClick={handleCreate} disabled={creating || !supplierId || !createExternalId.trim() || !createName.trim()} data-testid="categoryTree_createButton">
                {creating ? t("loading_creating") : t("create_category")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-[0.75rem]">
        {/* Supplier tabs for switching category trees by supplier */}
        <Tabs value={supplierId || "none"} onValueChange={(val) => { setSupplierId(val); onSupplierChange?.(val); }} className="w-full">
          <TabsList
            className="items-center flex w-full gap-2 h-9 overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-nowrap scroll-smooth snap-x snap-mandatory md:snap-none no-scrollbar md:px-0 bg-transparent p-0 text-foreground rounded-none border-b border-border md:border-0 justify-start"
            data-testid="categoryTree_supplierTabsList"
          >
            {suppliers.map((s) => (
              <TabsTrigger
                key={s.id}
                value={s.id}
                className="whitespace-nowrap py-1 font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow shrink-0 md:shrink snap-start md:snap-none w-auto truncate text-xs sm:text-sm px-2 sm:px-3 flex items-center gap-2 justify-start md:justify-start rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:border-primary transition-colors"
                data-testid={`categoryTree_supplierTab_${s.id}`}
                aria-label={s.supplier_name}
              >
                <span className="truncate">{s.supplier_name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-[0.5rem]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            data-testid="categoryTree_searchInput"
          />
        </div>

        {isLoading || isFetching ? (
          <div className="space-y-[0.5rem]">
            <Skeleton className="h-[1.25rem] w-full" />
            <Skeleton className="h-[1.25rem] w-[80%]" />
            <Skeleton className="h-[1.25rem] w-[60%]" />
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="rounded-md border p-[1rem] text-muted-foreground" data-testid="categoryTree_empty">
            <div className="font-medium">{t("no_categories_title")}</div>
            <div className="text-sm">{t("no_categories_description")}</div>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-[0.25rem]" data-testid="categoryTree_root">
              {filteredTree.map((n) => (
                <TreeNode key={n.id} node={n} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryTreeEditor;