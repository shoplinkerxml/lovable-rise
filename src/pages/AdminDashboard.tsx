import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/providers/i18n-provider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sun, Moon, AlignJustify, User2, StickyNote, CheckSquare, Mail } from "lucide-react";

const Stat = ({ title, value }: { title: string; value: string }) => (
  <Card className="shadow-sm">
    <CardContent className="pt-6">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      setEmail(user?.email ?? "");
      if (user?.id) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("full_name,name,email,avatar_url,avater_url")
          .eq("id", user.id)
          .limit(1)
          .maybeSingle();
        setName((profiles as any)?.full_name || (profiles as any)?.name || "");
        setAvatarUrl((profiles as any)?.avatar_url || (profiles as any)?.avater_url || "");
      }
    };
    load();
  }, []);

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub.publicUrl;
      await supabase.from('profiles').update({ avatar_url: url, avater_url: url } as any).eq('id', user.id);
      setAvatarUrl(url);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin-auth";
  };

  const { t, lang, setLang } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const toggleLang = () => setLang(lang === "uk" ? "en" : "uk");

  return (
    <div className="min-h-screen bg-emerald-50/40 dark:bg-neutral-950 flex">
      {/* Sidebar */}
      <aside className={`hidden md:flex ${collapsed ? "w-20" : "w-64"} transition-all shrink-0 border-r bg-background p-4 flex-col gap-6`}>
        <div className="text-xl font-semibold">{collapsed ? "MG" : "MarketGrow"}</div>
        <nav className="space-y-2">
          <div className="text-xs text-muted-foreground px-2">{t("sidebar_dashboard")}</div>
          <Button variant="secondary" className="w-full justify-start">{collapsed ? "" : "Сучасна"}</Button>
          <div className="text-xs text-muted-foreground mt-4 px-2">{t("sidebar_forms")}</div>
          <Button variant="ghost" className="w-full justify-start">{collapsed ? "" : "Елементи форм"}</Button>
          <Button variant="ghost" className="w-full justify-start">{collapsed ? "" : "Макети форм"}</Button>
          <Button variant="ghost" className="w-full justify-start">{collapsed ? "" : "Горизонтальні форми"}</Button>
          <Button variant="ghost" className="w-full justify-start">{collapsed ? "" : "Вертикальні форми"}</Button>
          <Button variant="ghost" className="w-full justify-start">{collapsed ? "" : "Кастомні форми"}</Button>
          <Button variant="ghost" className="w-full justify-start">{collapsed ? "" : "Валідація форм"}</Button>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="h-16 border-b bg-background flex items-center px-4 md:px-6 justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
              <AlignJustify className="h-5 w-5" />
            </Button>
            <div className="hidden md:flex ml-0"><Input placeholder={t("search")} className="w-72" /></div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => document.documentElement.classList.toggle("dark")}>
              <Sun className="h-5 w-5 hidden dark:block" />
              <Moon className="h-5 w-5 block dark:hidden" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title={lang === "uk" ? "Українська" : "English"}>
                  <span className="text-lg">{lang === "uk" ? "🇺🇦" : "🇺🇸"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang("uk")}>🇺🇦 Українська</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("en")}>🇺🇸 English</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Sheet>
              <SheetTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={avatarUrl || "/placeholder.svg"} alt="Admin" />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
              </SheetTrigger>
              <SheetContent side="right" className="w-96">
                <SheetHeader>
                  <SheetTitle>User Profile</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-6">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={avatarUrl || "/placeholder.svg"} alt="Admin" />
                      <AvatarFallback>AD</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{name || "Administrator"}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" />{email}</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Button variant="ghost" className="group w-full justify-start h-auto py-3 hover:bg-transparent" onClick={() => { window.location.href = "/admin/personal"; }}>
                      <User2 className="h-5 w-5 mr-3 text-emerald-600" />
                      <div>
                        <div className="font-medium group-hover:text-emerald-600 transition-colors">My Profile</div>
                        <div className="text-xs text-muted-foreground">Account settings</div>
                      </div>
                    </Button>
                    <Button variant="ghost" className="group w-full justify-start h-auto py-3 hover:bg-transparent">
                      <StickyNote className="h-5 w-5 mr-3 text-emerald-600" />
                      <div>
                        <div className="font-medium group-hover:text-emerald-600 transition-colors">My Notes</div>
                        <div className="text-xs text-muted-foreground">My Daily Notes</div>
                      </div>
                    </Button>
                    <Button variant="ghost" className="group w-full justify-start h-auto py-3 hover:bg-transparent">
                      <CheckSquare className="h-5 w-5 mr-3 text-emerald-600" />
                      <div>
                        <div className="font-medium group-hover:text-emerald-600 transition-colors">My Tasks</div>
                        <div className="text-xs text-muted-foreground">To-do and Daily tasks</div>
                      </div>
                    </Button>
                  </div>

                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" onClick={signOut}>Logout</Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="p-4 md:p-6 grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Stat title="Співробітники" value="96" />
            <Stat title="Клієнти" value="3,650" />
            <Stat title="Проєкти" value="356" />
            <Stat title="Виплати" value="₴3,6млн" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle>Оновлення виручки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-60 rounded-md bg-gradient-to-b from-blue-100 to-transparent flex items-end gap-2 p-4">
                  <div className="w-6 bg-blue-400 h-1/2 rounded" />
                  <div className="w-6 bg-blue-500 h-4/5 rounded" />
                  <div className="w-6 bg-blue-300 h-2/3 rounded" />
                  <div className="w-6 bg-blue-600 h-5/6 rounded" />
                  <div className="w-6 bg-blue-400 h-3/4 rounded" />
                  <div className="w-6 bg-blue-500 h-4/5 rounded" />
                  <div className="w-6 bg-blue-300 h-2/3 rounded" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Річний огляд</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-60 flex items-center justify-center">
                  <div className="h-44 w-44 rounded-full border-[10px] border-blue-400 border-t-gray-200 border-l-gray-200" />
                  <div className="absolute text-center">
                    <div className="text-xl font-semibold">₴1 342 000</div>
                    <div className="text-sm text-muted-foreground">+9% до 2024</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;


