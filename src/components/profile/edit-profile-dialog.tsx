//src/components/profile/edit-profile-dialog.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateUserProfile } from "@/app/actions/auth/update-user-profile";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface EditProfileDialogProps {
  userId: string;
  name: string;
  username: string;
  bio: string;
}

export function EditProfileDialog({
  userId,
  name,
  username,
  bio,
}: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name, username, bio });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    const result = await updateUserProfile({ ...formData, userId });
    setLoading(false);

    if (result.success) {
      toast.success("Profile updated successfully");
      setOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } else {
      toast.error("Failed to update profile: " + result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {loading || isPending ? "Saving..." : "Edit Profile"}
        </Button>
      </DialogTrigger>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Full Name
          </label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="username">
            Username
          </label>
          <Input
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="bio">
            Bio
          </label>
          <Textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Bio"
          />
        </div>
        <DialogFooter>
          <Button disabled={loading || isPending} onClick={handleSubmit}>
            {loading || isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
