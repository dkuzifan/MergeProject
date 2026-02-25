import type { CategoryMeta, CsCategory } from '../types'

export const CATEGORIES: CategoryMeta[] = [
  {
    slug: 'how-to-play',
    label: 'How to Play',
    icon: '🎮',
    description: '게임 기본 규칙과 조작법 안내',
  },
  {
    slug: 'events',
    label: 'Events',
    icon: '🎉',
    description: '진행 중인 이벤트 정보와 참가 방법',
  },
  {
    slug: 'rewards',
    label: 'Rewards',
    icon: '🏆',
    description: '보상 지급 기준과 수령 방법',
  },
  {
    slug: 'purchases',
    label: 'Purchases',
    icon: '💳',
    description: '결제, 환불, 구매 관련 안내',
  },
  {
    slug: 'account-device',
    label: 'Account & Device',
    icon: '📱',
    description: '계정 관리 및 기기 연동 문제',
  },
  {
    slug: 'etc',
    label: 'Etc',
    icon: '💬',
    description: '기타 문의 및 피드백',
  },
]

export const VALID_CATEGORY_SLUGS = new Set<CsCategory>(
  CATEGORIES.map((c) => c.slug)
)

export const CATEGORY_SLUG_MAP: Record<CsCategory, CategoryMeta> =
  Object.fromEntries(CATEGORIES.map((c) => [c.slug, c])) as Record<
    CsCategory,
    CategoryMeta
  >
