export const SHARE_TYPES = [
  "code",
  "document",
  "link",
  "bookmark",
  "note",
  "password",
] as const;

export type ShareType = (typeof SHARE_TYPES)[number];

export type Share = {
  id: string;
  owner_id: string | null;
  type: ShareType;
  slug: string;
  title: string;
  description: string | null;
  url: string | null;
  language: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

export type ShareContent = {
  id: string;
  share_id: string;
  body: string | null;
  html: string | null;
  notes: string | null;
  updated_at: string;
};

export type PasswordShare = {
  id: string;
  share_id: string;
  encrypted_payload: string;
  iv: string;
  salt: string;
  access_code_hash: string;
  decrypt_code_hash: string;
  public_names: string[];
  updated_at: string;
};

export type PublicShare = Share & {
  share_contents: ShareContent | null;
};

export type CcLink = {
  id: string;
  slug: string;
  target_share_id: string;
  created_at: string;
  expires_at: string;
};

export const SHARE_TYPE_LABELS: Record<ShareType, string> = {
  code: "Code",
  document: "Document",
  link: "Link",
  bookmark: "Bookmark",
  note: "Note",
  password: "Password",
};
