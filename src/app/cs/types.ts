export type CsCategory =
  | 'how-to-play'
  | 'events'
  | 'rewards'
  | 'purchases'
  | 'account-device'
  | 'etc'

export interface CategoryMeta {
  slug: CsCategory
  label: string
  icon: string
  description: string
}

export interface CsArticle {
  id: string
  title: string
  excerpt: string
  body: string
  tags: string[]
  category: CsCategory
  href: string
}

export interface SearchResult {
  article: CsArticle
  matchType: 'title' | 'body' | 'tag'
}

export type ContactTopic =
  | 'Loading Issues'
  | 'Purchases'
  | 'Technical'
  | 'Events & Rewards'
  | 'Game Features'
  | 'Account Information'
  | 'Feedback & Suggestions'

export const CONTACT_TOPICS: ContactTopic[] = [
  'Loading Issues',
  'Purchases',
  'Technical',
  'Events & Rewards',
  'Game Features',
  'Account Information',
  'Feedback & Suggestions',
]
