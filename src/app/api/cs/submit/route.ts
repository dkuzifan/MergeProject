import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await request.json()
  const { dateOfIssue, topic, description, firstName, email, attachmentUrls } = body

  if (!dateOfIssue || !topic || !description || !firstName || !email) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('cs_submissions').insert({
    date_of_issue: dateOfIssue,
    topic,
    description,
    first_name: firstName,
    email,
    attachment_urls: attachmentUrls ?? [],
  })

  if (error) {
    console.error('[cs/submit] insert error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
