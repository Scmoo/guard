import { supabase } from './supabaseClient.js'

export async function requireAuth(redirectTo = '/portal/login/') {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error || !data?.user) {
      window.location.href = redirectTo
      return null
    }

    return data.user
  } catch (err) {
    console.error('Auth guard error:', err)
    window.location.href = redirectTo
    return null
  }
}