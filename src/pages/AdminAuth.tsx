import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProfileService } from "@/lib/profile-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp, Plug, FileSpreadsheet, Tags, Sparkles, UploadCloud, BarChart3, Shield } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";

const AdminAuth = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) throw signInError;
      
      if (data.session) {
        // Ensure profile exists and has default avatar if missing
        try {
          const userId = data.session.user.id;
          const profile = await ProfileService.ensureProfile(userId, {
            email: data.session.user.email || '',
            name: data.session.user.user_metadata?.name || ''
          });
          
          if (!profile) {
            toast.error('Failed to load user profile. Please try again.');
            return;
          }
          
          if (!profile.avatar_url) {
            const defaultUrl = '/placeholder.svg';
            await ProfileService.updateProfile(userId, { avatar_url: defaultUrl });
          }
          
          toast.success('Login successful');
          navigate("/admin/dashboard");
        } catch (profileError) {
          console.error('Profile handling error:', profileError);
          // Still allow login even if profile operations fail
          navigate("/admin/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.message || "Не вдалося увійти. Перевірте дані.");
      toast.error(err.message || "Не вдалося увійти. Перевірте дані.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex">
      <div className="absolute right-4 top-4 md:right-8 md:top-8 z-10">
        <Button type="button" variant="ghost" onClick={() => setLang(lang === "uk" ? "en" : "uk")}>UA/EN</Button>
      </div>
      <div className="container mx-auto my-auto grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] items-center gap-4 md:gap-8">
      <div className="hidden md:flex flex-col justify-center md:items-end px-6 lg:px-10">
        <div className="max-w-xl">
          <div className="flex items-center space-x-3 mb-8">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold">MarketGrow</span>
          </div>
          <div className="inline-flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full text-sm mb-4">
            <span>↗</span>
            <span>{t("hero_badge")}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{t("hero_title")}</h1>
          <p className="text-muted-foreground mb-8">{t("hero_desc")}</p>
          <Card className="bg-emerald-50 border-emerald-100">
            <CardHeader>
              <CardTitle className="text-base">{t("features_title")}</CardTitle>
              <CardDescription className="text-emerald-900/80">{t("features_subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm text-emerald-900/90">
                <li className="flex items-start gap-2"><Plug className="h-4 w-4 mt-0.5" /> {t("feat_integrations")}</li>
                <li className="flex items-start gap-2"><FileSpreadsheet className="h-4 w-4 mt-0.5" /> {t("feat_convert")}</li>
                <li className="flex items-start gap-2"><Tags className="h-4 w-4 mt-0.5" /> {t("feat_mapping")}</li>
                <li className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-0.5" /> {t("feat_enrichment")}</li>
                <li className="flex items-start gap-2"><UploadCloud className="h-4 w-4 mt-0.5" /> {t("feat_export")}</li>
                <li className="flex items-start gap-2"><BarChart3 className="h-4 w-4 mt-0.5" /> {t("feat_analytics")}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center md:items-start justify-center md:justify-start p-6 md:p-0">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-center">{t("login_title")}</CardTitle>
              <CardDescription className="text-center">{t("login_desc")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t("email")}</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("password")}</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}
              <Button type="submit" disabled={loading} className="w-full bg-emerald-200 text-emerald-900 hover:bg-emerald-300">
                {loading ? "…" : t("sign_in")}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t("no_account")} <Link className="text-emerald-600 hover:underline" to="#">{t("sign_up")}</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default AdminAuth;


