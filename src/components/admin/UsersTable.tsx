import React from "react";
import { format } from "date-fns";
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
import { Switch } from "@/components/ui/switch";
import { 
  MoreHorizontal, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Edit,
  Trash2,
  Mail,
  Phone,
  User
} from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { StatusToggle } from "./StatusToggle";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: "user" | "admin" | "manager";
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  avatar_url?: string;
}

interface UsersTableProps {
  users: UserProfile[];
  loading?: boolean;
  onEditUser: (user: UserProfile) => void;
  onDeleteUser: (user: UserProfile) => void;
  onStatusToggle: (userId: string, newStatus: "active" | "inactive") => void;
  statusToggleLoading?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
}

const LoadingSkeleton = () => (
  <TableRow className="hover:bg-muted/50">
    {/* Customer Column */}
    <TableCell>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </TableCell>

    {/* Status Column */}
    <TableCell>
      <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
    </TableCell>

    {/* Email Column */}
    <TableCell>
      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
    </TableCell>

    {/* Phone Column */}
    <TableCell className="hidden md:table-cell">
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
    </TableCell>

    {/* Created Date Column */}
    <TableCell>
      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse hidden sm:block"></div>
    </TableCell>

    {/* Actions Column */}
    <TableCell className="text-right">
      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse ml-auto"></div>
    </TableCell>
  </TableRow>
);

const SortableHeader = ({ 
  column, 
  children, 
  sortBy, 
  sortOrder, 
  onSort 
}: {
  column: string;
  children: React.ReactNode;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
}) => {
  const isSorted = sortBy === column;
  
  return (
    <TableHead>
      <Button
        variant="ghost"
        onClick={() => onSort?.(column)}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        {children}
        {isSorted ? (
          sortOrder === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : (
            <ArrowDown className="ml-2 h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        )}
      </Button>
    </TableHead>
  );
};

const UserAvatar = ({ user }: { user: UserProfile }) => {
  const initials = user.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className="h-10 w-10">
      <AvatarImage src={user.avatar_url} alt={user.name} />
      <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

const StatusBadge = ({ status }: { status: "active" | "inactive" }) => {
  return (
    <Badge
      variant={status === "active" ? "default" : "secondary"}
      className={
        status === "active"
          ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
          : "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100"
      }
    >
      {status === "active" ? "Active" : "Inactive"}
    </Badge>
  );
};

const UserActionsDropdown = ({
  user,
  onEdit,
  onDelete,
}: {
  user: UserProfile;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const { t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
          <Edit className="mr-2 h-4 w-4" />
          {t("edit_action")}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`mailto:${user.email}`} className="cursor-pointer">
            <Mail className="mr-2 h-4 w-4" />
            {t("send_email")}
          </a>
        </DropdownMenuItem>
        {user.phone && (
          <DropdownMenuItem asChild>
            <a href={`tel:${user.phone}`} className="cursor-pointer">
              <Phone className="mr-2 h-4 w-4" />
              {t("call_user")}
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onDelete}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("delete_action")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function UsersTable({
  users,
  loading = false,
  onEditUser,
  onDeleteUser,
  onStatusToggle,
  statusToggleLoading = false,
  sortBy,
  sortOrder,
  onSort,
}: UsersTableProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader
              column="name"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            >
              {t("table_customer")}
            </SortableHeader>
            <TableHead>{t("table_status")}</TableHead>
            <SortableHeader
              column="email"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            >
              {t("table_email")}
            </SortableHeader>
            <TableHead className="hidden md:table-cell">{t("table_phone")}</TableHead>
            <SortableHeader
              column="created_at"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            >
              <span className="hidden sm:inline">{t("table_created")}</span>
              <span className="sm:hidden">{t("table_created")}</span>
            </SortableHeader>
            <TableHead className="text-right">{t("table_actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} />
            ))
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <User className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("no_users_found")}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/50">
                {/* Customer Column */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{user.name}</div>
                    </div>
                  </div>
                </TableCell>

                {/* Status Column */}
                <TableCell>
                  <StatusToggle
                    userId={user.id}
                    status={user.status}
                    onToggle={onStatusToggle}
                    disabled={statusToggleLoading}
                  />
                </TableCell>

                {/* Email Column */}
                <TableCell className="max-w-[250px]">
                  <div className="max-w-full truncate" title={user.email}>
                    {user.email}
                  </div>
                </TableCell>

                {/* Phone Column (hidden on mobile) */}
                <TableCell className="hidden md:table-cell">
                  {user.phone ? (
                    <a 
                      href={`tel:${user.phone}`}
                      className="text-muted-foreground hover:text-muted-foreground hover:underline"
                    >
                      {user.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Created Date Column */}
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(user.created_at), "MMM dd, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {format(new Date(user.created_at), "HH:mm")}
                  </div>
                </TableCell>

                {/* Actions Column */}
                <TableCell className="text-right">
                  <UserActionsDropdown
                    user={user}
                    onEdit={() => onEditUser(user)}
                    onDelete={() => onDeleteUser(user)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}