-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.channels (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  guild_id text,
  name text NOT NULL,
  type integer NOT NULL,
  topic text,
  nsfw boolean DEFAULT false,
  position integer DEFAULT 0,
  bitrate integer DEFAULT 64000,
  user_limit integer DEFAULT 0,
  rate_limit_per_user integer DEFAULT 0,
  parent_id uuid,
  owner_id uuid,
  last_message_id uuid,
  last_pin_timestamp timestamp with time zone,
  default_auto_archive_duration integer DEFAULT 1440,
  flags integer DEFAULT 0,
  video_quality_mode integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  icon text,
  default_thread_rate_limit_per_user text,
  permission_overwrites jsonb,
  retention_policy_id bigint,
  channel_id text UNIQUE,
  CONSTRAINT channels_pkey PRIMARY KEY (id),
  CONSTRAINT channels_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.channels(id),
  CONSTRAINT channels_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.guilds(guild_id)
);
CREATE TABLE public.developer_settings (
  user_id uuid NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT developer_settings_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.direct_channel_recipients (
  channel_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT direct_channel_recipients_pkey PRIMARY KEY (channel_id, user_id),
  CONSTRAINT direct_channel_recipients_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.direct_channels(id),
  CONSTRAINT direct_channel_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.direct_channels (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  type integer NOT NULL,
  owner_id uuid,
  last_message_id uuid,
  flags integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT direct_channels_pkey PRIMARY KEY (id),
  CONSTRAINT direct_channels_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);
CREATE TABLE public.emoji_roles (
  emoji_id uuid NOT NULL,
  role_id uuid NOT NULL,
  CONSTRAINT emoji_roles_pkey PRIMARY KEY (emoji_id, role_id),
  CONSTRAINT emoji_roles_emoji_id_fkey FOREIGN KEY (emoji_id) REFERENCES public.emojis(id),
  CONSTRAINT emoji_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.emojis (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  animated boolean DEFAULT false,
  available boolean DEFAULT true,
  managed boolean DEFAULT false,
  require_colons boolean DEFAULT true,
  guild_id uuid,
  user_id uuid,
  image_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT emojis_pkey PRIMARY KEY (id),
  CONSTRAINT emojis_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.guilds(id),
  CONSTRAINT emojis_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.guild_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  guild_id uuid,
  user_id uuid,
  nick text,
  avatar text,
  banner text,
  joined_at timestamp with time zone DEFAULT now(),
  premium_since timestamp with time zone,
  deaf boolean DEFAULT false,
  mute boolean DEFAULT false,
  pending boolean DEFAULT false,
  communication_disabled_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT guild_members_pkey PRIMARY KEY (id),
  CONSTRAINT guild_members_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.guilds(id),
  CONSTRAINT guild_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.guilds (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  icon text,
  banner text,
  splash text,
  owner_id text,
  region text,
  preferred_locale text DEFAULT 'en-US'::text,
  features ARRAY DEFAULT '{}'::text[],
  verification_level integer DEFAULT 0,
  default_message_notifications integer DEFAULT 0,
  explicit_content_filter integer DEFAULT 0,
  mfa_level integer DEFAULT 0,
  premium_tier integer DEFAULT 0,
  premium_progress_bar_enabled boolean DEFAULT false,
  nsfw boolean DEFAULT false,
  large boolean DEFAULT false,
  member_count integer DEFAULT 0,
  max_members integer DEFAULT 100000,
  max_video_channel_users integer DEFAULT 25,
  afk_channel_id uuid,
  afk_timeout integer DEFAULT 300,
  system_channel_id uuid,
  system_channel_flags integer DEFAULT 0,
  rules_channel_id uuid,
  public_updates_channel_id uuid,
  vanity_url_code text,
  discovery_splash text,
  safety_alerts_channel_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  guild_owner_id text,
  guild_id text UNIQUE,
  CONSTRAINT guilds_pkey PRIMARY KEY (id)
);
CREATE TABLE public.local_settings (
  user_id uuid NOT NULL,
  service_worker_mode text DEFAULT 'disabled'::text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT local_settings_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.member_roles (
  member_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT member_roles_pkey PRIMARY KEY (member_id, role_id),
  CONSTRAINT member_roles_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.guild_members(id),
  CONSTRAINT member_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.message_attachments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id uuid,
  filename text NOT NULL,
  content_type text,
  size bigint NOT NULL,
  url text NOT NULL,
  proxy_url text,
  width integer,
  height integer,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id)
);
CREATE TABLE public.message_embeds (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id uuid,
  title text,
  type text,
  description text,
  url text,
  timestamp timestamp with time zone,
  color integer,
  footer_text text,
  footer_icon_url text,
  image_url text,
  image_proxy_url text,
  image_width integer,
  image_height integer,
  thumbnail_url text,
  thumbnail_proxy_url text,
  thumbnail_width integer,
  thumbnail_height integer,
  video_url text,
  video_width integer,
  video_height integer,
  video_proxy_url text,
  provider_name text,
  author_name text,
  author_url text,
  author_icon_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_embeds_pkey PRIMARY KEY (id),
  CONSTRAINT message_embeds_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id)
);
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id uuid,
  emoji_id uuid,
  emoji_name text NOT NULL,
  emoji_animated boolean DEFAULT false,
  count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id)
);
CREATE TABLE public.message_stickers (
  message_id uuid NOT NULL,
  sticker_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_stickers_pkey PRIMARY KEY (message_id, sticker_id),
  CONSTRAINT message_stickers_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id),
  CONSTRAINT message_stickers_sticker_id_fkey FOREIGN KEY (sticker_id) REFERENCES public.stickers(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  channel_id text,
  guild_id text,
  author_id uuid,
  content text,
  timestamp timestamp with time zone DEFAULT now(),
  edited_timestamp timestamp with time zone,
  tts boolean DEFAULT false,
  mention_everyone boolean DEFAULT false,
  pinned boolean DEFAULT false,
  type integer DEFAULT 0,
  webhook_id uuid,
  message_reference_id uuid,
  nonce text,
  flags integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  message_id text UNIQUE,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id),
  CONSTRAINT messages_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.channels(channel_id),
  CONSTRAINT messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(channel_id),
  CONSTRAINT messages_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.guilds(guild_id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  guild_id uuid,
  name text NOT NULL,
  color integer DEFAULT 0,
  hoist boolean DEFAULT false,
  managed boolean DEFAULT false,
  mentionable boolean DEFAULT false,
  permissions bigint DEFAULT 0,
  position integer DEFAULT 0,
  icon text,
  unicode_emoji text,
  flags integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id),
  CONSTRAINT roles_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.guilds(id)
);
CREATE TABLE public.stickers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  tags text,
  type integer NOT NULL,
  format_type integer NOT NULL,
  guild_id uuid,
  sort_value integer DEFAULT 0,
  image_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stickers_pkey PRIMARY KEY (id),
  CONSTRAINT stickers_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.guilds(id)
);
CREATE TABLE public.uptime_data (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  instance_name text NOT NULL,
  online boolean NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT uptime_data_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_instances (
  user_id uuid NOT NULL,
  instance_name text NOT NULL,
  server_urls jsonb NOT NULL,
  token text NOT NULL,
  email text NOT NULL,
  pfpsrc text,
  localuser_store jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_instances_pkey PRIMARY KEY (user_id, instance_name)
);
CREATE TABLE public.user_message_reactions (
  user_id uuid NOT NULL,
  message_reaction_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_message_reactions_pkey PRIMARY KEY (user_id, message_reaction_id),
  CONSTRAINT user_message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_message_reactions_message_reaction_id_fkey FOREIGN KEY (message_reaction_id) REFERENCES public.message_reactions(id)
);
CREATE TABLE public.user_preferences (
  user_id uuid NOT NULL,
  locale text DEFAULT 'en'::text,
  theme text DEFAULT 'dark'::text,
  accent_color text,
  animate_gifs text DEFAULT 'true'::text,
  animate_icons text DEFAULT 'true'::text,
  volume integer DEFAULT 50,
  notisound text DEFAULT 'default'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  instance_name text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_accessed timestamp with time zone DEFAULT now(),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.voice_states (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  guild_id uuid,
  channel_id uuid,
  user_id uuid,
  session_id text NOT NULL,
  deaf boolean DEFAULT false,
  mute boolean DEFAULT false,
  self_deaf boolean DEFAULT false,
  self_mute boolean DEFAULT false,
  self_video boolean DEFAULT false,
  self_stream boolean DEFAULT false,
  suppress boolean DEFAULT false,
  request_to_speak_timestamp timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT voice_states_pkey PRIMARY KEY (id),
  CONSTRAINT voice_states_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.guilds(id),
  CONSTRAINT voice_states_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id),
  CONSTRAINT voice_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);