import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js'
import { Database } from '@alexa-multi-agent/shared-types'

export function createLibraryClient(
  supabaseUrl: string,
  supabaseKey: string,
  options?: SupabaseClientOptions<'public'>
) {
  return createClient<Database>(supabaseUrl, supabaseKey, options)
}

export type LibrarySupabaseClient = ReturnType<typeof createLibraryClient>

