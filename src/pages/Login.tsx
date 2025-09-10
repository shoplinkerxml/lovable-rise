import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, User, CheckCircle2, Facebook, Chrome } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { UserAuthService } from "@/lib/user-auth-service";
import { 
  loginSchema, 
  LoginData
} from "@/lib/user-auth-schemas";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const Login = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Login form
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema)
  });

  const handleLogin = async (data: LoginData) => {
    setLoading(true);
    try {
      const { user, session, error } = await UserAuthService.login(data);
      
      if (error === 'redirect_to_admin') {
        navigate("/admin");
        return;
      }
      
      if (error) {
        toast.error(t(error as any) || t("login_failed"));
        return;
      }

      if (user && session) {
        toast.success(t("login_success"));
        navigate("/user/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(t("login_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await UserAuthService.signInWithGoogle();
      // OAuth will redirect, so no further action needed
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    try {
      await UserAuthService.signInWithFacebook();
      // OAuth will redirect, so no further action needed
    } catch (error) {
      console.error("Facebook sign-in error:", error);
      toast.error("Failed to sign in with Facebook");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex">
      {/* Language Toggle */}
      <div className="absolute right-4 top-4 md:right-8 md:top-8 z-10">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => setLang(lang === "uk" ? "en" : "uk")}
          className="text-emerald-700 hover:bg-emerald-50"
        >
          {lang === "uk" ? "EN" : "UA"}
        </Button>
      </div>

      <div className="container mx-auto my-auto grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] items-center gap-4 md:gap-8">
        
        {/* Left Panel - Marketing Content */}
        <div className="hidden md:flex flex-col justify-center md:items-end px-6 lg:px-10">
          <div className="max-w-xl">
            {/* Brand Header */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold">MarketGrow</span>
            </div>

            {/* Hero Badge */}
            <div className="inline-flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full text-sm mb-4">
              <span>↗</span>
              <span>Welcome back to your growth journey</span>
            </div>

            {/* Hero Content */}
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Sign in to MarketGrow
            </h1>
            <p className="text-muted-foreground mb-8">
              Access your personalized dashboard and continue building your business growth strategies.
            </p>

            {/* Features Card */}
            <Card className="bg-emerald-50 border-emerald-100">
              <CardHeader>
                <CardTitle className="text-base">Your Dashboard Awaits</CardTitle>
                <CardDescription className="text-emerald-900/80">
                  Continue where you left off
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-emerald-900/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                    Personal dashboard with your metrics
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                    Customizable menu and workflows
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                    Secure data and privacy protection
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                    Real-time analytics and insights
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex items-center md:items-start justify-center md:justify-start p-6 md:p-0">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                <User className="h-6 w-6" />
              </div>
              <CardTitle>{t("login_title_user")}</CardTitle>
              <CardDescription className="mt-2">
                {t("login_desc_user")}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Social Auth Buttons */}
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  Sign in with Google
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleFacebookSignIn}
                  disabled={loading}
                >
                  <Facebook className="h-4 w-4 mr-2" />
                  Sign in with Facebook
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder={t("email_placeholder")}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">
                      {t(errors.email.message as any) || errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    placeholder={t("password_placeholder")}
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600">
                      {t(errors.password.message as any) || errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm">
                      Remember me
                    </Label>
                  </div>
                  <Link
                    to="/reset-password"
                    className="text-sm text-emerald-600 hover:underline"
                  >
                    {t("forgot_password")}
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? "Signing in..." : t("login_button_user")}
                </Button>
              </form>

              <div className="space-y-2 text-center text-sm text-muted-foreground">
                <p>
                  {t("no_account_user")} 
                  <Link
                    to="/register"
                    className="text-emerald-600 hover:underline ml-1"
                  >
                    {t("register_button")}
                  </Link>
                </p>
                <p>
                  Admin or Manager? 
                  <Link
                    to="/admin-auth"
                    className="text-emerald-600 hover:underline ml-1"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;