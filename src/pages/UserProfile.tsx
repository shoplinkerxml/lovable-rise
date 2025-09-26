import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserAuthService } from "@/lib/user-auth-service";
import { ProfileService } from "@/lib/profile-service";
import { UserProfile as UserProfileType } from "@/lib/user-auth-schemas";
import { useI18n } from "@/providers/i18n-provider";
import { ArrowLeft, User, Save, Upload, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const UserProfile = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [user, setUser] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { user: currentUser, error } = await UserAuthService.getCurrentUser();
        if (error) {
          console.error("Error fetching user:", error);
          navigate("/user-auth");
          return;
        }
        if (currentUser) {
          // Ensure the user has the correct role for the user profile page
          if (currentUser.role === 'admin' || currentUser.role === 'manager') {
            // Redirect admin/manager users to admin profile
            navigate("/admin/personal");
            return;
          }
          
          setUser(currentUser);
          setName(currentUser.name || "");
          setPhone(currentUser.phone || "");
        }
      } catch (error) {
        console.error("Error:", error);
        navigate("/user-auth");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const updatedProfile = await ProfileService.updateProfile(user.id, {
        name: name.trim(),
        phone: phone.trim() || null
      });

      if (updatedProfile) {
        // Update local state
        setUser({ ...user, name: name.trim(), phone: phone.trim() || undefined });
        toast.success(t("profile_updated_success"));
      } else {
        throw new Error(t("failed_update_profile"));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("failed_update_profile"));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const updatedProfile = await ProfileService.updateProfile(user.id, { avatar_url: publicUrl });

      if (updatedProfile) {
        setUser({ ...user, avatar_url: publicUrl });
        toast.success(t("avatar_updated_success"));
      } else {
        throw new Error(t("failed_upload_avatar"));
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(t("failed_upload_avatar"));
    } finally {
      setUploading(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("profile_loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/user/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("profile_back_to_dashboard")}
          </Button>

          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("profile_personal_information")}
              </CardTitle>
              <CardDescription>
                {t("profile_update_info")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.avatar_url} alt={user?.name} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl">
                    {user?.name ? getUserInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                      {user?.role}
                    </Badge>
                    <Badge variant={user?.status === 'active' ? 'default' : 'secondary'}>
                      {user?.status}
                    </Badge>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? t("profile_uploading") : t("profile_change_avatar")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("full_name")}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("name_placeholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("profile_email")}</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">{t("profile_email_cannot_be_changed")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("profile_phone")}</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("profile_member_since")}</Label>
                  <Input
                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  variant="default"
                  className="w-full md:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? t("profile_uploading") : t("profile_save_changes")}
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
};

export default UserProfile;