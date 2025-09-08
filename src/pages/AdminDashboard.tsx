import { Button } from "@/components/ui/button";
import AdminSidebar from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/providers/i18n-provider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sun, Moon, AlignJustify, User2, Mail } from "lucide-react";
const Stat = ({
  title,
  value
}: {
  title: string;
  value: string;
}) => <Card className="shadow-sm">
    <CardContent className="pt-6">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </CardContent>
  </Card>;
const AdminDashboard = () => {
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<string>("Business");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  useEffect(() => {
    const load = async () => {
      const {
        data: userData
      } = await supabase.auth.getUser();
      const user = userData.user;
      setEmail(user?.email ?? "");
      if (user?.id) {
        const {
          data: profiles,
          error
        } = await supabase.from("profiles").select("name,email,avatar_url,role").eq("id", user.id).limit(1).maybeSingle();
        if (error) {
          console.error("profiles select error:", error);
          return;
        }
        setName((profiles as any)?.name || "");
        setAvatarUrl(((profiles as any)?.avatar_url || "").trim());
        setRole((profiles as any)?.role || "Business");
      }
    };
    load();
  }, []);
  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const {
        data: userData
      } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      await supabase.storage.from('avatars').upload(path, file, {
        upsert: true
      });
      const {
        data: pub
      } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub.publicUrl;
      await supabase.from('profiles').update({
        avatar_url: url
      } as any).eq('id', user.id);
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
  const {
    t,
    lang,
    setLang
  } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const toggleLang = () => setLang(lang === "uk" ? "en" : "uk");
  return <div className="min-h-screen bg-emerald-50/40 dark:bg-neutral-950 flex">
      {/* Sidebar from DB */}
      <AdminSidebar />

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
    <div role="button" className="pl-2 pr-3 py-1 h-auto rounded-lg border-l select-none">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl || "/placeholder.svg"} alt="Admin" />
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col text-left leading-tight">
          <span className="text-sm font-medium">{name || "Administrator"}</span>
          <span className="text-xs text-muted-foreground">{role}</span>
        </div>
      </div>
    </div>
  </SheetTrigger>
              <SheetContent side="right" className="w-96">
                <SheetHeader>
                  <SheetTitle>{t("user_profile")}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-6">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={avatarUrl || "/placeholder.svg"} alt="Admin" />
                      <AvatarFallback>AD</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{name || "Administrator"}</div>
                      <div className="text-sm text-muted-foreground">{role}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" />{email}</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start h-auto py-3 hover:bg-transparent" onClick={() => { window.location.href = "/admin/personal"; }}>
                      <div className="h-8 w-8 mr-3 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <User2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{t("menu_profile")}</div>
                        <div className="text-xs text-muted-foreground">{t("menu_profile_desc")}</div>
                      </div>
                    </Button>
                  </div>
                  <div className="border-t pt-4">
                    <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" onClick={signOut}>
                      Logout
                    </Button>
                  </div>
                  
                  
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
    </div>;
};
export default AdminDashboard;