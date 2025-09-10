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
  registrationSchema, 
  RegistrationData
} from "@/lib/user-auth-schemas";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const Register = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Registration form
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema)
  });

  const handleRegistration = async (data: RegistrationData) => {
    if (!acceptTerms) {
      toast.error(t("terms_required"));
      return;
    }

    setLoading(true);
    try {
      const { user, session, error } = await UserAuthService.register(data);
      
      // Enhanced error handling based on new error types
      if (error === 'email_exists') {
        toast.error(
          lang === 'uk' 
            ? 'Акаунт з цією електронною поштою вже існує. Будь ласка, увійдіть в систему.'
            : 'An account with this email already exists. Please sign in instead.'
        );
        // Offer helpful action
        setTimeout(() => {
          const shouldRedirect = confirm(
            lang === 'uk' 
              ? 'Перейти до сторінки входу?'
              : 'Go to sign in page?'
          );
          if (shouldRedirect) {
            navigate('/login');
          }
        }, 1000);
        return;
      }
      
      if (error === 'rate_limit_exceeded') {
        toast.error(
          lang === 'uk'
            ? 'Забагато спроб реєстрації. Спробуйте ще раз через кілька хвилин.'
            : 'Too many registration attempts. Please try again in a few minutes.'
        );
        return;
      }
      
      if (error === 'email_confirmation_required') {
        toast.success(
          lang === 'uk'
            ? 'Реєстрація успішна! Перевірте електронну пошту для підтвердження облікового запису.'
            : 'Registration successful! Please check your email for confirmation.'
        );
        // Show success message and redirect after delay
        setTimeout(() => {
          toast.success(
            lang === 'uk'
              ? 'Після підтвердження електронної пошти ви зможете увійти в систему.'
              : 'After confirming your email, you will be able to sign in.'
          );
          navigate("/user-auth");
        }, 2000);
        return;
      }
      
      if (error === 'profile_creation_failed') {
        toast.error(
          lang === 'uk'
            ? 'Акаунт створено, але сталася помилка налаштування профілю. Зверніться до підтримки.'
            : 'Account created but profile setup failed. Please contact support.'
        );
        return;
      }
      
      if (error === 'network_error') {
        toast.error(
          lang === 'uk'
            ? 'Помилка мережі. Перевірте підключення до інтернету та спробуйте ще раз.'
            : 'Network error. Please check your connection and try again.'
        );
        return;
      }
      
      if (error === 'validation_error') {
        toast.error(
          lang === 'uk'
            ? 'Помилка валідації даних. Перевірте введену інформацію.'
            : 'Data validation error. Please check your input.'
        );
        return;
      }
      
      if (error) {
        // Fallback error handling
        console.error('Unhandled registration error:', error);
        toast.error(
          lang === 'uk'
            ? 'Сталася помилка під час реєстрації. Спробуйте ще раз.'
            : 'Registration failed. Please try again.'
        );
        return;
      }

      if (user && session) {
        toast.success(
          lang === 'uk'
            ? 'Реєстрація успішна! Ласкаво просимо!'
            : 'Registration successful! Welcome!'
        );
        // Redirect after delay to show success message
        setTimeout(() => {
          navigate("/user/dashboard");
        }, 1500);
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        lang === 'uk'
          ? 'Неочікувана помилка. Спробуйте ще раз або зверніться до підтримки.'
          : 'Unexpected error. Please try again or contact support.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await UserAuthService.signInWithGoogle();
      // OAuth will redirect, so no further action needed
    } catch (error) {
      console.error("Google sign-up error:", error);
      toast.error("Failed to sign up with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignUp = async () => {
    setLoading(true);
    try {
      await UserAuthService.signInWithFacebook();
      // OAuth will redirect, so no further action needed
    } catch (error) {
      console.error("Facebook sign-up error:", error);
      toast.error("Failed to sign up with Facebook");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex">
      {/* Language Toggle - Improved hover state */}
      <div className="absolute right-4 top-4 md:right-8 md:top-8 z-10">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => setLang(lang === "uk" ? "en" : "uk")}
          className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
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
              <span>{t("hero_badge")}</span>
            </div>

            {/* Hero Content */}
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {t("hero_title")}
            </h1>
            <p className="text-muted-foreground mb-8">
              {t("hero_desc")}
            </p>

            {/* Features Card */}
            <Card className="bg-emerald-50 border-emerald-100">
              <CardHeader>
                <CardTitle className="text-base">{t("features_title")}</CardTitle>
                <CardDescription className="text-emerald-900/80">
                  {t("features_subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-emerald-900/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                    {t("feat_integrations")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                    {t("feat_convert")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                    {t("feat_mapping")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                    {t("feat_enrichment")}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Registration Form */}
        <div className="flex items-center md:items-start justify-center md:justify-start p-6 md:p-0">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                <User className="h-6 w-6" />
              </div>
              <CardTitle>{t("register_title")}</CardTitle>
              <CardDescription className="mt-2">
                {t("register_desc")}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Social Auth Buttons - Single Row Layout */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  {t("google_signup")}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleFacebookSignUp}
                  disabled={loading}
                >
                  <Facebook className="h-4 w-4 mr-2" />
                  {t("facebook_signup")}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t("continue_with_email")}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit(handleRegistration)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("full_name")}</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder={t("name_placeholder")}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">
                      {t(errors.name.message as any) || errors.name.message}
                    </p>
                  )}
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("confirm_password")}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...register("confirmPassword")}
                    placeholder={t("password_placeholder")}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">
                      {t(errors.confirmPassword.message as any) || errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    {t("accept_terms")}
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || !acceptTerms} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? (lang === 'uk' ? "Створюється акаунт..." : "Creating account...") : t("register_button")}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                {t("already_account")} 
                <Link
                  to="/login"
                  className="text-emerald-600 hover:underline ml-1"
                >
                  {t("sign_in")}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;