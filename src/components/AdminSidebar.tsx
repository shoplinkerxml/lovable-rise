import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

type MenuItem = {
  id: number;
  title: string;
  path: string;
  parent_id: number | null;
  order_index: number;
  is_active: boolean;
};

function buildTree(items: MenuItem[]): Record<number | "root", MenuItem[]> {
  const map: Record<number | "root", MenuItem[]> = { root: [] };
  for (const it of items) {
    const key = (it.parent_id ?? "root") as number | "root";
    if (!map[key]) map[key] = [];
    map[key].push(it);
  }
  for (const key in map) {
    map[key as any].sort((a, b) => a.order_index - b.order_index);
  }
  return map;
}

export const AdminSidebar = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("id,title,path,parent_id,order_index,is_active")
          .eq("is_active", true)
          .order("order_index", { ascending: true });
        if (!error) setItems((data as any) || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const tree = useMemo(() => buildTree(items), [items]);

  return (
    <aside className={`hidden md:flex w-64 transition-all shrink-0 border-r bg-background p-4 flex-col gap-3`}> 
      <div className="text-xl font-semibold">MarketGrow</div>
      <nav className="space-y-1">
        {loading && <div className="text-xs text-muted-foreground px-2">Loading…</div>}
        {tree.root?.map((it) => (
          <div key={it.id}>
            <NavLink
              to={it.path}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm ${isActive || location.pathname === it.path ? "bg-secondary" : "hover:bg-accent"}`
              }
            >
              {it.title}
            </NavLink>
            {tree[it.id]?.length ? (
              <div className="ml-3 mt-1 space-y-1">
                {tree[it.id].map((child) => (
                  <NavLink
                    key={child.id}
                    to={child.path}
                    className={({ isActive }) =>
                      `block px-3 py-1.5 rounded-md text-sm ${isActive || location.pathname === child.path ? "bg-secondary" : "hover:bg-accent"}`
                    }
                  >
                    {child.title}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
      <Button variant="secondary" className="mt-auto" onClick={() => navigate("/admin/dashboard")}>Dashboard</Button>
    </aside>
  );
};

export default AdminSidebar;


