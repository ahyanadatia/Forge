"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface AvatarUploadProps {
  userId: string;
  currentUrl: string | null;
  initials: string;
  onUploaded: (url: string | null) => void;
}

export function AvatarUpload({
  userId,
  currentUrl,
  initials,
  onUploaded,
}: AvatarUploadProps) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Only JPG, PNG, and WebP images are accepted.");
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError("Image must be under 5 MB.");
        return;
      }

      setUploading(true);
      try {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${userId}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true, contentType: file.type });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);

        const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

        await (supabase as any)
          .from("builders")
          .update({ avatar_url: publicUrl })
          .eq("id", userId);

        setPreviewUrl(urlWithCacheBust);
        onUploaded(publicUrl);
      } catch (err: any) {
        setError(err?.message ?? "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [userId, supabase, onUploaded]
  );

  const handleRemove = useCallback(async () => {
    setUploading(true);
    setError(null);
    try {
      const { data: files } = await supabase.storage
        .from("avatars")
        .list(userId);

      if (files && files.length > 0) {
        await supabase.storage
          .from("avatars")
          .remove(files.map((f) => `${userId}/${f.name}`));
      }

      await (supabase as any)
        .from("builders")
        .update({ avatar_url: null })
        .eq("id", userId);

      setPreviewUrl(null);
      onUploaded(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to remove avatar.");
    } finally {
      setUploading(false);
    }
  }, [userId, supabase, onUploaded]);

  return (
    <div className="flex items-center gap-5">
      <div className="relative group">
        <Avatar className="h-20 w-20 border-2 border-border">
          <AvatarImage src={previewUrl ?? undefined} />
          <AvatarFallback className="text-xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="mr-1.5 h-3.5 w-3.5" />
            {previewUrl ? "Change" : "Upload"}
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={handleRemove}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, or WebP. Max 5 MB.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
