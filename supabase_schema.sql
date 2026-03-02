-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vault_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'text'::text CHECK (type = ANY (ARRAY['text'::text, 'announcements'::text, 'resources'::text, 'private'::text])),
  position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  icon text,
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT chats_vault_id_fkey FOREIGN KEY (vault_id) REFERENCES public.vaults(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text,
  reply_to_id uuid,
  attachments jsonb,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vault_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text,
  picture text,
  position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  can_manage_content boolean NOT NULL DEFAULT false,
  CONSTRAINT roles_pkey PRIMARY KEY (id),
  CONSTRAINT vault_roles_vault_id_fkey FOREIGN KEY (vault_id) REFERENCES public.vaults(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  pfp text,
  banner text,
  bio text,
  last_active_at timestamp with time zone,
  timezone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.vault_member_roles (
  user_id uuid NOT NULL,
  vault_id uuid NOT NULL,
  role_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vault_member_roles_pkey PRIMARY KEY (user_id, vault_id, role_id),
  CONSTRAINT vault_member_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT vault_member_roles_user_id_vault_id_fkey FOREIGN KEY (user_id) REFERENCES public.vault_members(user_id),
  CONSTRAINT vault_member_roles_user_id_vault_id_fkey FOREIGN KEY (vault_id) REFERENCES public.vault_members(user_id),
  CONSTRAINT vault_member_roles_user_id_vault_id_fkey FOREIGN KEY (user_id) REFERENCES public.vault_members(vault_id),
  CONSTRAINT vault_member_roles_user_id_vault_id_fkey FOREIGN KEY (vault_id) REFERENCES public.vault_members(vault_id)
);
CREATE TABLE public.vault_members (
  user_id uuid NOT NULL,
  vault_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  last_accessed_at timestamp with time zone,
  CONSTRAINT vault_members_pkey PRIMARY KEY (user_id, vault_id),
  CONSTRAINT vault_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT vault_members_vault_id_fkey FOREIGN KEY (vault_id) REFERENCES public.vaults(id)
);
CREATE TABLE public.vaults (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  banner text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  select_vault_icon text,
  CONSTRAINT vaults_pkey PRIMARY KEY (id)
);