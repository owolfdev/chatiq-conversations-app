"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bell, Globe, Shield, Upload, User, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { DeleteAccountDialog } from "@/components/profile/delete-account-dialog";
import { updateTeamName } from "@/app/actions/teams/update-team-name";
import { Loader2 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  username: string;
  bio: string;
  avatar_url?: string;
  email: string;
  marketing_emails?: boolean;
}

interface SettingsClientProps {
  initialProfile: Profile | null;
  teamName: string | null;
  isTeamOwner: boolean;
}

export default function SettingsClient({
  initialProfile,
  teamName,
  isTeamOwner,
}: SettingsClientProps) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState(teamName || "");
  const [teamNameError, setTeamNameError] = useState<string | null>(null);
  const [teamNameSuccess, setTeamNameSuccess] = useState<string | null>(null);
  const [isUpdatingTeamName, startTeamRenameTransition] = useTransition();
  const [isUpdatingMarketingEmails, startMarketingEmailsTransition] =
    useTransition();

  const supabase = createClient();

  useEffect(() => {
    setProfile(initialProfile);
    if (typeof initialProfile?.marketing_emails === "boolean") {
      setMarketingEmails(initialProfile.marketing_emails);
    }
  }, [initialProfile]);

  useEffect(() => {
    setTeamNameInput(teamName || "");
  }, [teamName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setProfile((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || !profile) return;

    setUploading(true);
    const file = event.target.files[0];
    const fileExt = file.name.split(".").pop();
    const filePath = `${profile.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError.message);
      toast.error("Upload failed.");
      setUploading(false);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("bot_user_profiles")
      .update({ avatar_url: publicUrl.publicUrl })
      .eq("id", profile.id);

    if (!updateError) {
      setProfile({ ...profile, avatar_url: publicUrl.publicUrl });
      toast.success("Avatar updated.");
    } else {
      console.error("Profile update error:", updateError.message);
      toast.error("Avatar save failed.");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { updateUserProfile } = await import(
      "@/app/actions/auth/update-user-profile"
    );
    const result = await updateUserProfile({
      userId: profile.id,
      name: profile.full_name,
      username: profile.username,
      bio: profile.bio,
    });
    setLoading(false);
    toast[result.success ? "success" : "error"](
      result.success ? "Profile updated." : result.error
    );
  };

  const handleTeamNameSubmit = () => {
    setTeamNameError(null);
    setTeamNameSuccess(null);

    startTeamRenameTransition(async () => {
      const result = await updateTeamName(teamNameInput);
      if (result.success) {
        setTeamNameSuccess("Team name updated successfully.");
        toast.success("Team name updated.");
      } else {
        setTeamNameError(result.error || "Failed to update team name.");
        toast.error(result.error || "Failed to update team name.");
      }
    });
  };

  const handleMarketingEmailsChange = (value: boolean) => {
    const previousValue = marketingEmails;
    setMarketingEmails(value);

    startMarketingEmailsTransition(async () => {
      const { updateMarketingEmailPreference } = await import(
        "@/app/actions/email/update-marketing-email-preference"
      );
      const result = await updateMarketingEmailPreference(value);
      if (!result.success) {
        setMarketingEmails(previousValue);
        toast.error(result.error || "Failed to update email preference.");
        return;
      }
      toast.success("Marketing email preference updated.");
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div>
        {/* <p className="text-sm uppercase tracking-wide text-primary">Create</p> */}
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {teamName
            ? `Manage your account preferences and ${teamName}'s team settings.`
            : "Manage your account preferences and security settings."}
        </p>
        {teamName && (
          <div className="mt-2">
            <Badge variant="outline" className="text-sm">
              {teamName}
            </Badge>
          </div>
        )}
      </div>

      {/* Team Settings */}
      {teamName && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Settings
            </CardTitle>
            <CardDescription>
              {isTeamOwner
                ? "Manage settings for your team workspace"
                : "View team settings (only owners can make changes)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isTeamOwner && (
              <Alert>
                <AlertTitle>Read-only access</AlertTitle>
                <AlertDescription>
                  Only team owners can modify team settings. Contact your team
                  owner to make changes.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="team-name"
                  value={teamNameInput}
                  maxLength={60}
                  onChange={(event) => {
                    setTeamNameInput(event.target.value);
                    setTeamNameError(null);
                    setTeamNameSuccess(null);
                  }}
                  disabled={!isTeamOwner || isUpdatingTeamName}
                  readOnly={!isTeamOwner}
                  className={!isTeamOwner ? "bg-muted" : ""}
                />
                {isTeamOwner && (
                  <Button
                    onClick={handleTeamNameSubmit}
                    disabled={
                      isUpdatingTeamName ||
                      teamNameInput.trim() === (teamName || "").trim()
                    }
                  >
                    {isUpdatingTeamName ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                )}
              </div>
              {teamNameError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {teamNameError}
                </p>
              )}
              {teamNameSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  {teamNameSuccess}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                2–60 characters. This name appears in the team switcher and
                throughout the dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Information */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and profile picture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={profile.avatar_url || "/placeholder.svg"}
                  alt={profile.full_name}
                />
                <AvatarFallback className="text-lg">
                  {profile.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label htmlFor="avatar-upload">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                  >
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Change Avatar"}
                    </span>
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </Label>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  JPG, PNG or GIF. Max size 2MB.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={profile.full_name || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" value={profile.email || ""} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={profile.username || ""}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                name="bio"
                value={profile.bio || ""}
                onChange={handleChange}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Preferences
          </CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select defaultValue="en">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select defaultValue="america/new_york">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="america/new_york">Eastern Time</SelectItem>
                  <SelectItem value="america/chicago">Central Time</SelectItem>
                  <SelectItem value="america/denver">Mountain Time</SelectItem>
                  <SelectItem value="america/los_angeles">
                    Pacific Time
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose what notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Receive notifications about your chatbots and account
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Receive push notifications in your browser
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="marketing-emails">Marketing Emails</Label>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Receive updates about new features and tips
                </p>
              </div>
              <Switch
                id="marketing-emails"
                checked={marketingEmails}
                onCheckedChange={handleMarketingEmailsChange}
                disabled={isUpdatingMarketingEmails}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="two-factor">Two-Factor Authentication</Label>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Add an extra layer of security to your account
              </p>
            </div>
            <Switch
              id="two-factor"
              checked={twoFactorAuth}
              onCheckedChange={setTwoFactorAuth}
            />
          </div>

          <div className="space-y-3">
            <Label>Password</Label>
            <div className="flex gap-2">
              <Input type="password" placeholder="Current password" />
              <Button variant="outline">Change Password</Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Active Sessions</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg dark:border-zinc-700">
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Chrome on macOS • New York, NY
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Current
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg dark:border-zinc-700">
                <div>
                  <p className="font-medium">Mobile App</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    iPhone • Last active 2 hours ago
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  Revoke
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg dark:border-red-800">
            <div>
              <h4 className="font-medium text-red-600 dark:text-red-400">
                Delete Account
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Permanently delete your account and all associated data
              </p>
            </div>
            <DeleteAccountDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
