// Authentication utilities for Supabase
// Using dynamic import to delay loading until runtime
let supabaseAuth: any = null;

async function getSupabaseAuth() {
	if (!supabaseAuth) {
		try {
			// Use CDN import for browser compatibility
			const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
			const SUPABASE_URL = 'https://vkgkqcsjgiyadivuxosp.supabase.co';
			const SUPABASE_ANON_KEY = 'sb_publishable_ErhOA0SIFaLJKXAIovqu8A_CSaXxW7q';
			supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
		} catch (error) {
			console.error("Failed to initialize Supabase client:", error);
			throw error;
		}
	}
	return supabaseAuth;
}

/**
 * Store authentication token
 */
export function storeAuthToken(token: string): void {
	localStorage.setItem('sb_auth_token', token);
}

/**
 * Get stored authentication token
 */
export function getAuthToken(): string | null {
	return localStorage.getItem('sb_auth_token');
}

/**
 * Clear authentication token
 */
export function clearAuthToken(): void {
	localStorage.removeItem('sb_auth_token');
	localStorage.removeItem('sb_user_id');
	localStorage.removeItem('sb_user_email');
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<{ user: any; session: any } | null> {
	try {
		const supabase = await getSupabaseAuth();
		const { data, error } = await supabase.auth.signUp({
			email,
			password
		});

		if (error) {
			console.error('Sign up error:', error);
			return null;
		}

		if (data.user && data.session) {
			storeAuthToken(data.session.access_token);
			localStorage.setItem('sb_user_id', data.user.id);
			localStorage.setItem('sb_user_email', data.user.email);
		}

		return data;
	} catch (error) {
		console.error('Sign up error:', error);
		return null;
	}
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ user: any; session: any } | null> {
	try {
		const supabase = await getSupabaseAuth();
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			console.error('Sign in error:', error);
			return null;
		}

		if (data.user && data.session) {
			storeAuthToken(data.session.access_token);
			localStorage.setItem('sb_user_id', data.user.id);
			localStorage.setItem('sb_user_email', data.user.email);
		}

		return data;
	} catch (error) {
		console.error('Sign in error:', error);
		return null;
	}
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
	try {
		const supabase = await getSupabaseAuth();
		await supabase.auth.signOut();
		clearAuthToken();
	} catch (error) {
		console.error('Sign out error:', error);
	}
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<any> {
	try {
		const supabase = await getSupabaseAuth();
		const { data: { user }, error } = await supabase.auth.getUser();

		if (error) {
			console.error('Get user error:', error);
			return null;
		}

		return user;
	} catch (error) {
		console.error('Get user error:', error);
		return null;
	}
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
	const user = await getCurrentUser();
	return user !== null;
}

/**
 * Initialize authentication session from stored token
 */
export async function initializeAuth(): Promise<void> {
	try {
		const token = getAuthToken();
		if (!token) return;

		const supabase = await getSupabaseAuth();
		const { data: { user }, error } = await supabase.auth.getUser(token);

		if (error || !user) {
			clearAuthToken();
			return;
		}

		// Restore user info to localStorage if missing
		if (!localStorage.getItem('sb_user_id')) {
			localStorage.setItem('sb_user_id', user.id);
		}
		if (!localStorage.getItem('sb_user_email')) {
			localStorage.setItem('sb_user_email', user.email);
		}
	} catch (error) {
		console.error('Auth initialization error:', error);
		clearAuthToken();
	}
}
