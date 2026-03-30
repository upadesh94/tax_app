import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
	process.env.EXPO_PUBLIC_SUPABASE_URL ||
	process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
	process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	throw new Error(
		'Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in app/.env (or NEXT_PUBLIC_* equivalents).'
	);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
