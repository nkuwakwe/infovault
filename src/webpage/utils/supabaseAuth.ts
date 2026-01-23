// Supabase client initialization
// Using dynamic import to delay loading until runtime
let supabaseClient: any = null;

async function getSupabaseClient() {
	if (!supabaseClient) {
		try {
			const { createClient } = await import("@supabase/supabase-js");
			const supabaseUrl = "https://vkgkqcsjgiyadivuxosp.supabase.co";
			const supabaseKey = "sb_secret_pgNYIvV5HjQcsNcPYFcDaQ_9KXe1_NO";

			if (!supabaseUrl || !supabaseKey) {
				throw new Error("Supabase URL and Key are required");
			}

			supabaseClient = createClient(supabaseUrl, supabaseKey);
		} catch (error) {
			console.error("Failed to initialize Supabase client:", error);
			throw error;
		}
	}
	return supabaseClient;
}

const SUPABASE_URL = 'https://vkgkqcsjgiyadivuxosp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ErhOA0SIFaLJKXAIovqu8A_CSaXxW7q';

interface AuthResponse {
    user: {
        id: string;
        email: string;
    };
    session: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
    } | null;
    error?: {
        message: string;
        status: number;
    };
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string): Promise<{
	user: any;
	session: any;
	error: null;
} | {
	user: null;
	session: null;
	error: Error;
}> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client.auth.signUp({
			email,
			password,
		});

		if (error) {
			return { user: null, session: null, error };
		}

		return {
			user: data.user,
			session: data.session,
			error: null,
		};
	} catch (error) {
		return {
			user: null,
			session: null,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            return {
                user: { id: '', email: '' },
                session: null,
                error: {
                    message: data.error_description || 'Invalid credentials',
                    status: response.status
                }
            };
        }

        return {
            user: {
                id: data.user.id,
                email: data.user.email
            },
            session: {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in
            }
        };
    } catch (err) {
        return {
            user: { id: '', email: '' },
            session: null,
            error: {
                message: err instanceof Error ? err.message : 'Authentication failed',
                status: 0
            }
        };
    }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: null } | { error: Error }> {
	try {
		const client = await getSupabaseClient();
		const { error } = await client.auth.signOut();

		if (error) {
			return { error };
		}

		return { error: null };
	} catch (error) {
		return {
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

/**
 * Get the current session
 */
export async function getSession() {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client.auth.getSession();

		if (error) {
			return { session: null, error };
		}

		return { session: data.session, error: null };
	} catch (error) {
		return {
			session: null,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

/**
 * Get the current user
 */
export async function getUser() {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client.auth.getUser();

		if (error) {
			return { user: null, error };
		}

		return { user: data.user, error: null };
	} catch (error) {
		return {
			user: null,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

/**
 * Store user access token in localStorage for persistent sessions
 */
export function storeAuthToken(token: string): void {
	localStorage.setItem("sb_auth_token", token);
}

/**
 * Retrieve stored auth token from localStorage
 */
export function getAuthToken(): string | null {
    return localStorage.getItem('sb_auth_token');
}

/**
 * Clear stored auth token from localStorage
 */
export function clearAuthToken(): void {
    localStorage.removeItem('sb_auth_token');
    localStorage.removeItem('sb_user_id');
    localStorage.removeItem('sb_user_email');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
	const { session } = await getSession();
	return session !== null;
}
