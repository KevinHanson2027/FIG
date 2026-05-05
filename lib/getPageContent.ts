import { createClient } from '@/lib/supabase/server'

export async function getPageContent(slug: string): Promise<Record<string, string>> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('page_content')
      .select('content')
      .eq('page_slug', slug)
      .maybeSingle()
    return (data?.content as Record<string, string>) ?? {}
  } catch {
    return {}
  }
}

/** Parse "Label | URL" textarea lines into link arrays */
export function parseLinks(raw: string): { label: string; url: string }[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const idx = line.indexOf('|')
      if (idx === -1) return null
      return { label: line.slice(0, idx).trim(), url: line.slice(idx + 1).trim() }
    })
    .filter(Boolean) as { label: string; url: string }[]
}
