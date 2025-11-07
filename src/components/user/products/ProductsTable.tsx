import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { format } from "date-fns";
import { Edit, MoreHorizontal, Package, Trash2 } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { ProductService, type Product } from "@/lib/product-service";

type ProductsTableProps = {
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => Promise<void> | void;
  onCreateNew?: () => void;
  onProductsLoaded?: (count: number) => void;
  refreshTrigger?: number;
};

const LoadingSkeleton = () => (
  <TableRow className="hover:bg-muted/50">
    <TableCell>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-muted animate-pulse" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-28 bg-muted rounded animate-pulse"></div>
          <div className="h-3 w-36 bg-muted rounded animate-pulse mt-1 hidden sm:block"></div>
        </div>
      </div>
    </TableCell>
    <TableCell>
      <div className="h-6 w-16 bg-muted rounded-full animate-pulse"></div>
    </TableCell>
    <TableCell className="hidden md:table-cell">
      <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
    </TableCell>
    <TableCell className="text-right">
      <div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto"></div>
    </TableCell>
  </TableRow>
);

function ProductStatusBadge({ available }: { available?: boolean }) {
  const { t } = useI18n();
  const isActive = available ?? false;
  return (
    <Badge
      variant={isActive ? "default" : "secondary"}
      className={
        isActive
          ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10"
          : "bg-muted/50 text-muted-foreground border-muted hover:bg-muted/50"
      }
    >
      {isActive ? t("status_active") : t("status_inactive")}
    </Badge>
  );
}

function ProductActionsDropdown({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Open row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
          <Edit className="mr-2 h-4 w-4" />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getMainImage(product: Product): string | undefined {
  return undefined;
}

export const ProductsTable = ({
  onEdit,
  onDelete,
  onCreateNew,
  onProductsLoaded,
  refreshTrigger,
}: ProductsTableProps) => {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });

  const productsCount = products.length;

  useEffect(() => {
    loadProducts();
  }, [refreshTrigger]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await ProductService.getProducts();
      setProducts(data);
      onProductsLoaded?.(data.length);
    } catch (error) {
      console.error("Failed to load products", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.product) return;
    try {
      await onDelete?.(deleteDialog.product.id);
      setDeleteDialog({ open: false, product: null });
      loadProducts();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const rows = useMemo(() => products, [products]);

  if (!loading && productsCount === 0) {
    return (
      <div className="rounded-md border p-6" data-testid="user_products_empty_wrap">
        <Empty>
          <EmptyHeader>
            <EmptyMedia className="text-primary">
              <Package className="h-[1.5rem] w-[1.5rem]" />
            </EmptyMedia>
            <EmptyTitle>{t("no_products")}</EmptyTitle>
            <EmptyDescription>{t("no_products_description")}</EmptyDescription>
          </EmptyHeader>
          <Button onClick={onCreateNew} className="mt-4" data-testid="user_products_create_btn">
            {t("create_product")}
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="rounded-md border" data-testid="user_products_table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table_product")}</TableHead>
            <TableHead>{t("table_status")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("table_price")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("table_stock")}</TableHead>
            <TableHead>{t("table_created")}</TableHead>
            <TableHead className="text-right">{t("table_actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <>
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
            </>
          )}
          {!loading && rows.map((product) => {
            const img = getMainImage(product);
            const initials = (product.name || "?")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <TableRow key={product.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-md">
                      {img ? (
                        <AvatarImage src={img} alt={product.name || ""} />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate" title={product.name || ""}>{product.name || "—"}</div>
                      {product.brand && (
                        <div className="text-sm text-muted-foreground truncate">{product.brand}</div>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <ProductStatusBadge available={product.available} />
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {product.price != null ? (
                    <span className="tabular-nums">{product.price}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="hidden lg:table-cell">
                  {product.stock_quantity != null ? (
                    <span className="tabular-nums">{product.stock_quantity}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell>
                  {product.created_at ? (
                    <div className="flex flex-col">
                      <span className="tabular-nums">{format(new Date(product.created_at), "yyyy-MM-dd")}</span>
                      <span className="text-muted-foreground hidden sm:block tabular-nums">
                        {format(new Date(product.created_at), "HH:mm")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <ProductActionsDropdown
                    onEdit={() => onEdit?.(product)}
                    onDelete={() => setDeleteDialog({ open: true, product })}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, product: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_product_confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.product?.name ? (
                <span>
                  {t("delete")}: "{deleteDialog.product?.name}". {t("cancel")}?
                </span>
              ) : (
                <span>{t("delete_product_confirm")}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};