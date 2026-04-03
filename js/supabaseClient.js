// Login Authorization that connects to Login Provider

import { createClient } from 'https://esm.sh/@supabase/supabase-js'

export const supabase = createClient(
  'https://qnrpsbynxawahuwzjwxj.supabase.co',
  'sb_publishable_wyGhhgvbZ3qwZyYL-Z-g0Q_8AI-3u3d'
)