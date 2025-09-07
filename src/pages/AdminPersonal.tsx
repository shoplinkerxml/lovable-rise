import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AdminPersonal = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      setEmail(user?.email ?? "");
      if (user?.id) {
        const { data } = await supabase.from("profiles").select("full_name,name,avatar_url").eq("id", user.id).maybeSingle();
        setName((data as any)?.full_name || (data as any)?.name || "");
        setAvatarUrl((data as any)?.avatar_url || "");
      }
    };
    load();
  }, []);

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const ext = file.name.split('.').pop();
    const path = `avatars/${user.id}-${Date.now()}.${ext}`;
    await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = pub.publicUrl;
    await supabase.from('profiles').update({ avatar_url: url } as any).eq('id', user.id);
    setAvatarUrl(url);
    e.target.value = '';
  };

  const save = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user?.id) {
      await supabase.from('profiles').update({ full_name: name } as any).eq('id', user.id);
    }
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-6">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>Редагувати профіль</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <Avatar className="h-28 w-28">
                <AvatarImage src={avatarUrl || "/placeholder.svg"} />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <label className="mt-3 text-sm font-medium">Завантажити новий</label>
              <input type="file" accept="image/*" onChange={onAvatarChange} />
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="text-sm font-medium">Повне ім'я</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value={email} disabled />
            </div>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">Зберегти</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPersonal;


