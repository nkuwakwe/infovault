# Database Structure Analysis - Infovault Project

## Overview
This document outlines the database structure and database-related components found in the Infovault codebase.

## Database Technology
- **Primary Database**: Supabase (PostgreSQL-based)
- **Authentication**: Supabase Auth
- **Client Library**: @supabase/supabase-js v2.39.0

## Database Configuration

### Supabase Connection Details
- **URL**: https://vkgkqcsjgiyadivuxosp.supabase.co
- **Anonymous Key**: sb_publishable_ErhOA0SIFaLJKXAIovqu8A_CSaXxW7q
- **Secret Key**: sb_secret_pgNYIvV5HjQcsNcPYFcDaQ_9KXe1_NO (used server-side)

### Authentication Implementation
Located in: `src/webpage/utils/supabaseAuth.ts`

#### Key Functions:
- `signUp(email, password)` - User registration
- `signIn(email, password)` - User authentication  
- `signOut()` - User logout
- `getSession()` - Get current session
- `getUser()` - Get current user
- `isAuthenticated()` - Check authentication status
- `storeAuthToken(token)` - Store token in localStorage
- `getAuthToken()` - Retrieve stored token
- `clearAuthToken()` - Clear stored tokens

## Database Schema Analysis

### Current Limitations
Based on the codebase analysis, the following observations were made:

1. **No Local Schema Files**: No `.sql` files, Prisma schema, or explicit database migration files were found in the repository.

2. **No Direct Database Queries**: The codebase primarily uses Supabase's authentication endpoints rather than direct database operations.

3. **External Database Management**: The database schema appears to be managed through the Supabase dashboard rather than version-controlled migrations.

### Authentication Tables (Supabase Auth)
Supabase automatically manages these tables:
- `auth.users` - User accounts
- `auth.sessions` - User sessions  
- `auth.refresh_tokens` - Refresh tokens
- `auth.identities` - Social login identities
- `auth.mfa_factors` - Multi-factor authentication

### Application Data Structure
Based on the TypeScript interfaces and API usage patterns, the application likely manages:

#### User-related Data
- User profiles and preferences
- User settings and configurations
- Authentication tokens and sessions

#### Communication Data
- Guilds/Servers
- Channels (text, voice)
- Messages
- Direct messages
- User roles and permissions

#### Media and Content
- Emoji data
- Stickers
- File attachments
- Voice data

## Database Access Patterns

### Authentication Flow
1. **Registration**: Uses Supabase auth signup endpoint
2. **Login**: Uses Supabase auth token endpoint
3. **Session Management**: Stores tokens in localStorage
4. **API Integration**: Combines Supabase auth with Spacebar API

### Data Access Methods
- **Supabase Client**: Used for authentication operations
- **Direct API Calls**: For Spacebar instance communication
- **Local Storage**: For client-side data persistence

## Security Considerations

### Authentication Security
- Password-based authentication with Supabase
- JWT token management
- Secure token storage in localStorage
- Session expiration handling

### API Security
- Anonymous key used for client-side operations
- Secret key used for server-side operations
- CORS and authentication headers properly configured

## Recommendations

### For Database Documentation
1. **Create Migration Files**: Add SQL migration files to track schema changes
2. **Schema Documentation**: Document custom tables and relationships
3. **Environment Variables**: Move sensitive keys to environment variables
4. **Type Definitions**: Create TypeScript interfaces for database models

### For Database Management
1. **Version Control**: Include database schema in version control
2. **Backup Strategy**: Implement regular database backups
3. **Monitoring**: Add database performance monitoring
4. **Access Control**: Review and tighten database permissions

## Files Related to Database Operations

### Core Database Files
- `src/webpage/utils/supabaseAuth.ts` - Supabase authentication utilities
- `src/webpage/login.ts` - Login implementation using Supabase
- `src/webpage/signup.html` - User registration page
- `src/webpage/register.ts` - Registration logic

### Configuration Files
- `package.json` - Dependencies including @supabase/supabase-js

### Data Models (Implied)
- User management throughout the application
- Guild and channel management
- Message and communication handling
- Settings and preferences storage

## Conclusion

The Infovault project uses Supabase as its primary database solution, focusing heavily on authentication through Supabase Auth. The actual database schema is managed externally through the Supabase platform rather than through version-controlled migrations in this repository. The application combines Supabase authentication with Spacebar API functionality for a complete communication platform.

For complete database schema details, access the Supabase dashboard at https://vkgkqcsjgiyadivuxosp.supabase.co or review the database through Supabase's built-in schema viewer.
