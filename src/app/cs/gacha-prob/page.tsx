'use client'

import { useState } from 'react'

type CardEntry = { name: string; prob: string }
type RankGroup = { rankLabel: string; cards: CardEntry[]; rankProb: string }
type BundleItem = { name: string; prob: string }

type PackConfig = {
  id: string
  name: string
  icon: string
  type: 'description' | 'card' | 'bundle'
  groups?: RankGroup[]
  notes?: string
  items?: BundleItem[]
  description?: string
}

const CONFIGS: PackConfig[] = [
  {
    id: 'description',
    name: '설명',
    icon: '📋',
    type: 'description',
    description:
      '각 카드팩에서 획득 가능한 카드 목록과 확률을 안내합니다. 카드팩을 선택하면 해당 카드팩의 카드 목록과 각 카드의 획득 확률을 확인하실 수 있습니다.',
    notes:
      '※ 확률은 소수점 세 자리까지 표시됩니다.\n※ 동일 등급 내 카드 확률의 합산은 해당 등급의 전체 확률과 일치합니다.\n※ 확률은 운영 정책에 따라 변경될 수 있습니다.',
  },
  {
    id: 'pack-1',
    name: '카드팩 1',
    icon: '🃏',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '2.000%',
        cards: [
          { name: '카드 A', prob: '1.000%' },
          { name: '카드 B', prob: '1.000%' },
        ],
      },
      {
        rankLabel: '★★★★',
        rankProb: '8.000%',
        cards: [
          { name: '카드 C', prob: '2.000%' },
          { name: '카드 D', prob: '2.000%' },
          { name: '카드 E', prob: '2.000%' },
          { name: '카드 F', prob: '2.000%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '20.000%',
        cards: [
          { name: '카드 G', prob: '5.000%' },
          { name: '카드 H', prob: '5.000%' },
          { name: '카드 I', prob: '5.000%' },
          { name: '카드 J', prob: '5.000%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '30.000%',
        cards: [
          { name: '카드 K', prob: '10.000%' },
          { name: '카드 L', prob: '10.000%' },
          { name: '카드 M', prob: '10.000%' },
        ],
      },
      {
        rankLabel: '★',
        rankProb: '40.000%',
        cards: [
          { name: '카드 N', prob: '20.000%' },
          { name: '카드 O', prob: '20.000%' },
        ],
      },
    ],
    notes: '※ 카드팩 1은 기본 카드팩입니다.',
  },
  {
    id: 'pack-2',
    name: '카드팩 2',
    icon: '🃏',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '2.500%',
        cards: [
          { name: '카드 P', prob: '1.250%' },
          { name: '카드 Q', prob: '1.250%' },
        ],
      },
      {
        rankLabel: '★★★★',
        rankProb: '7.500%',
        cards: [
          { name: '카드 R', prob: '2.500%' },
          { name: '카드 S', prob: '2.500%' },
          { name: '카드 T', prob: '2.500%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '20.000%',
        cards: [
          { name: '카드 U', prob: '6.667%' },
          { name: '카드 V', prob: '6.667%' },
          { name: '카드 W', prob: '6.666%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '30.000%',
        cards: [
          { name: '카드 X', prob: '15.000%' },
          { name: '카드 Y', prob: '15.000%' },
        ],
      },
      {
        rankLabel: '★',
        rankProb: '40.000%',
        cards: [
          { name: '카드 Z', prob: '20.000%' },
          { name: '카드 AA', prob: '20.000%' },
        ],
      },
    ],
  },
  {
    id: 'pack-3',
    name: '카드팩 3',
    icon: '🃏',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '3.000%',
        cards: [
          { name: '카드 AB', prob: '1.500%' },
          { name: '카드 AC', prob: '1.500%' },
        ],
      },
      {
        rankLabel: '★★★★',
        rankProb: '7.000%',
        cards: [
          { name: '카드 AD', prob: '3.500%' },
          { name: '카드 AE', prob: '3.500%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '20.000%',
        cards: [
          { name: '카드 AF', prob: '5.000%' },
          { name: '카드 AG', prob: '5.000%' },
          { name: '카드 AH', prob: '5.000%' },
          { name: '카드 AI', prob: '5.000%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '30.000%',
        cards: [
          { name: '카드 AJ', prob: '10.000%' },
          { name: '카드 AK', prob: '10.000%' },
          { name: '카드 AL', prob: '10.000%' },
        ],
      },
      {
        rankLabel: '★',
        rankProb: '40.000%',
        cards: [
          { name: '카드 AM', prob: '20.000%' },
          { name: '카드 AN', prob: '20.000%' },
        ],
      },
    ],
  },
  {
    id: 'pack-4',
    name: '카드팩 4',
    icon: '🃏',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '1.500%',
        cards: [{ name: '카드 AO', prob: '1.500%' }],
      },
      {
        rankLabel: '★★★★',
        rankProb: '8.500%',
        cards: [
          { name: '카드 AP', prob: '2.833%' },
          { name: '카드 AQ', prob: '2.833%' },
          { name: '카드 AR', prob: '2.834%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '20.000%',
        cards: [
          { name: '카드 AS', prob: '5.000%' },
          { name: '카드 AT', prob: '5.000%' },
          { name: '카드 AU', prob: '5.000%' },
          { name: '카드 AV', prob: '5.000%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '30.000%',
        cards: [
          { name: '카드 AW', prob: '15.000%' },
          { name: '카드 AX', prob: '15.000%' },
        ],
      },
      {
        rankLabel: '★',
        rankProb: '40.000%',
        cards: [
          { name: '카드 AY', prob: '20.000%' },
          { name: '카드 AZ', prob: '20.000%' },
        ],
      },
    ],
  },
  {
    id: 'pack-5',
    name: '카드팩 5',
    icon: '🃏',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '2.000%',
        cards: [
          { name: '카드 BA', prob: '1.000%' },
          { name: '카드 BB', prob: '1.000%' },
        ],
      },
      {
        rankLabel: '★★★★',
        rankProb: '8.000%',
        cards: [
          { name: '카드 BC', prob: '2.000%' },
          { name: '카드 BD', prob: '2.000%' },
          { name: '카드 BE', prob: '2.000%' },
          { name: '카드 BF', prob: '2.000%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '20.000%',
        cards: [
          { name: '카드 BG', prob: '5.000%' },
          { name: '카드 BH', prob: '5.000%' },
          { name: '카드 BI', prob: '5.000%' },
          { name: '카드 BJ', prob: '5.000%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '30.000%',
        cards: [
          { name: '카드 BK', prob: '10.000%' },
          { name: '카드 BL', prob: '10.000%' },
          { name: '카드 BM', prob: '10.000%' },
        ],
      },
      {
        rankLabel: '★',
        rankProb: '40.000%',
        cards: [
          { name: '카드 BN', prob: '20.000%' },
          { name: '카드 BO', prob: '20.000%' },
        ],
      },
    ],
  },
  {
    id: 'pack-6',
    name: '카드팩 6',
    icon: '🃏',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '2.000%',
        cards: [
          { name: '카드 BP', prob: '1.000%' },
          { name: '카드 BQ', prob: '1.000%' },
        ],
      },
      {
        rankLabel: '★★★★',
        rankProb: '8.000%',
        cards: [
          { name: '카드 BR', prob: '2.000%' },
          { name: '카드 BS', prob: '2.000%' },
          { name: '카드 BT', prob: '2.000%' },
          { name: '카드 BU', prob: '2.000%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '20.000%',
        cards: [
          { name: '카드 BV', prob: '5.000%' },
          { name: '카드 BW', prob: '5.000%' },
          { name: '카드 BX', prob: '5.000%' },
          { name: '카드 BY', prob: '5.000%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '30.000%',
        cards: [
          { name: '카드 BZ', prob: '10.000%' },
          { name: '카드 CA', prob: '10.000%' },
          { name: '카드 CB', prob: '10.000%' },
        ],
      },
      {
        rankLabel: '★',
        rankProb: '40.000%',
        cards: [
          { name: '카드 CC', prob: '20.000%' },
          { name: '카드 CD', prob: '20.000%' },
        ],
      },
    ],
  },
  {
    id: 'xl-pack-1',
    name: 'XL 카드팩 1',
    icon: '✨',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '5.000%',
        cards: [
          { name: 'XL 카드 A', prob: '2.500%' },
          { name: 'XL 카드 B', prob: '2.500%' },
        ],
      },
      {
        rankLabel: '★★★★',
        rankProb: '15.000%',
        cards: [
          { name: 'XL 카드 C', prob: '5.000%' },
          { name: 'XL 카드 D', prob: '5.000%' },
          { name: 'XL 카드 E', prob: '5.000%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '30.000%',
        cards: [
          { name: 'XL 카드 F', prob: '10.000%' },
          { name: 'XL 카드 G', prob: '10.000%' },
          { name: 'XL 카드 H', prob: '10.000%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '50.000%',
        cards: [
          { name: 'XL 카드 I', prob: '25.000%' },
          { name: 'XL 카드 J', prob: '25.000%' },
        ],
      },
    ],
    notes: '※ XL 카드팩은 일반 카드팩보다 고등급 확률이 높습니다.',
  },
  {
    id: 'xl-pack-2',
    name: 'XL 카드팩 2',
    icon: '✨',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '5.000%',
        cards: [
          { name: 'XL 카드 K', prob: '2.500%' },
          { name: 'XL 카드 L', prob: '2.500%' },
        ],
      },
      {
        rankLabel: '★★★★',
        rankProb: '15.000%',
        cards: [
          { name: 'XL 카드 M', prob: '5.000%' },
          { name: 'XL 카드 N', prob: '5.000%' },
          { name: 'XL 카드 O', prob: '5.000%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '30.000%',
        cards: [
          { name: 'XL 카드 P', prob: '10.000%' },
          { name: 'XL 카드 Q', prob: '10.000%' },
          { name: 'XL 카드 R', prob: '10.000%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '50.000%',
        cards: [
          { name: 'XL 카드 S', prob: '25.000%' },
          { name: 'XL 카드 T', prob: '25.000%' },
        ],
      },
    ],
  },
  {
    id: 'xl-pack-3',
    name: 'XL 카드팩 3',
    icon: '✨',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '6.000%',
        cards: [
          { name: 'XL 카드 U', prob: '3.000%' },
          { name: 'XL 카드 V', prob: '3.000%' },
        ],
      },
      {
        rankLabel: '★★★★',
        rankProb: '14.000%',
        cards: [
          { name: 'XL 카드 W', prob: '7.000%' },
          { name: 'XL 카드 X', prob: '7.000%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '30.000%',
        cards: [
          { name: 'XL 카드 Y', prob: '10.000%' },
          { name: 'XL 카드 Z', prob: '10.000%' },
          { name: 'XL 카드 AA', prob: '10.000%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '50.000%',
        cards: [
          { name: 'XL 카드 AB', prob: '25.000%' },
          { name: 'XL 카드 AC', prob: '25.000%' },
        ],
      },
    ],
  },
  {
    id: 'xl-pack-4',
    name: 'XL 카드팩 4',
    icon: '✨',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '5.000%',
        cards: [
          { name: 'XL 카드 AD', prob: '2.500%' },
          { name: 'XL 카드 AE', prob: '2.500%' },
        ],
      },
      {
        rankLabel: '★★★★',
        rankProb: '15.000%',
        cards: [
          { name: 'XL 카드 AF', prob: '5.000%' },
          { name: 'XL 카드 AG', prob: '5.000%' },
          { name: 'XL 카드 AH', prob: '5.000%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '30.000%',
        cards: [
          { name: 'XL 카드 AI', prob: '10.000%' },
          { name: 'XL 카드 AJ', prob: '10.000%' },
          { name: 'XL 카드 AK', prob: '10.000%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '50.000%',
        cards: [
          { name: 'XL 카드 AL', prob: '25.000%' },
          { name: 'XL 카드 AM', prob: '25.000%' },
        ],
      },
    ],
  },
  {
    id: 'xl-pack-5',
    name: 'XL 카드팩 5',
    icon: '✨',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '5.000%',
        cards: [
          { name: 'XL 카드 AN', prob: '2.500%' },
          { name: 'XL 카드 AO', prob: '2.500%' },
        ],
      },
      {
        rankLabel: '★★★★',
        rankProb: '15.000%',
        cards: [
          { name: 'XL 카드 AP', prob: '5.000%' },
          { name: 'XL 카드 AQ', prob: '5.000%' },
          { name: 'XL 카드 AR', prob: '5.000%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '30.000%',
        cards: [
          { name: 'XL 카드 AS', prob: '10.000%' },
          { name: 'XL 카드 AT', prob: '10.000%' },
          { name: 'XL 카드 AU', prob: '10.000%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '50.000%',
        cards: [
          { name: 'XL 카드 AV', prob: '25.000%' },
          { name: 'XL 카드 AW', prob: '25.000%' },
        ],
      },
    ],
  },
  {
    id: 'xl-pack-6',
    name: 'XL 카드팩 6',
    icon: '✨',
    type: 'card',
    groups: [
      {
        rankLabel: '★★★★★',
        rankProb: '5.000%',
        cards: [
          { name: 'XL 카드 AX', prob: '2.500%' },
          { name: 'XL 카드 AY', prob: '2.500%' },
        ],
      },
      {
        rankLabel: '★★★★',
        rankProb: '15.000%',
        cards: [
          { name: 'XL 카드 AZ', prob: '5.000%' },
          { name: 'XL 카드 BA', prob: '5.000%' },
          { name: 'XL 카드 BB', prob: '5.000%' },
        ],
      },
      {
        rankLabel: '★★★',
        rankProb: '30.000%',
        cards: [
          { name: 'XL 카드 BC', prob: '10.000%' },
          { name: 'XL 카드 BD', prob: '10.000%' },
          { name: 'XL 카드 BE', prob: '10.000%' },
        ],
      },
      {
        rankLabel: '★★',
        rankProb: '50.000%',
        cards: [
          { name: 'XL 카드 BF', prob: '25.000%' },
          { name: 'XL 카드 BG', prob: '25.000%' },
        ],
      },
    ],
  },
  {
    id: 'bundle-1',
    name: '꾸러미 아이템 1',
    icon: '🎁',
    type: 'bundle',
    items: [
      { name: '아이템 A', prob: '30.000%' },
      { name: '아이템 B', prob: '25.000%' },
      { name: '아이템 C', prob: '20.000%' },
      { name: '아이템 D', prob: '15.000%' },
      { name: '아이템 E', prob: '10.000%' },
    ],
  },
  {
    id: 'bundle-2',
    name: '꾸러미 아이템 2',
    icon: '🎁',
    type: 'bundle',
    items: [
      { name: '아이템 F', prob: '35.000%' },
      { name: '아이템 G', prob: '30.000%' },
      { name: '아이템 H', prob: '20.000%' },
      { name: '아이템 I', prob: '10.000%' },
      { name: '아이템 J', prob: '5.000%' },
    ],
  },
]

const CARD_PACKS = CONFIGS.filter(
  (c) => c.type === 'card' && c.id.startsWith('pack-')
)
const XL_PACKS = CONFIGS.filter(
  (c) => c.type === 'card' && c.id.startsWith('xl-pack-')
)
const BUNDLES = CONFIGS.filter((c) => c.type === 'bundle')

export default function GachaProbPage() {
  const [selectedId, setSelectedId] = useState(CONFIGS[0].id)
  const selected = CONFIGS.find((c) => c.id === selectedId)!

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* 헤더 */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            확률 공지
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            카드팩 및 꾸러미 획득 확률 안내
          </p>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* 좌측 네비게이션 */}
          <nav
            className="shrink-0 bg-slate-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
            style={{ width: '22%' }}
          >
            {/* 설명 항목 */}
            <div>
              {CONFIGS.filter((c) => c.type === 'description').map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* 카드팩 그룹 */}
            <div>
              {CARD_PACKS.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* XL 카드팩 그룹 */}
            <div>
              {XL_PACKS.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* 꾸러미 그룹 */}
            <div>
              {BUNDLES.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}
            </div>
          </nav>

          {/* 우측 콘텐츠 */}
          <main className="flex-1 min-w-0 p-4 bg-white dark:bg-gray-950">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {selected.icon} {selected.name}
            </h2>

            {selected.type === 'description' && (
              <DescriptionContent config={selected} />
            )}
            {selected.type === 'card' && <CardTable config={selected} />}
            {selected.type === 'bundle' && <BundleTable config={selected} />}
          </main>
        </div>
      </div>
    </div>
  )
}

function NavItem({
  item,
  isSelected,
  onClick,
}: {
  item: PackConfig
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-2 text-xs flex items-center gap-1.5 transition-colors
        ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
        }`}
    >
      <span className="text-sm leading-none shrink-0">{item.icon}</span>
      <span className="leading-tight break-keep">{item.name}</span>
    </button>
  )
}

function DescriptionContent({ config }: { config: PackConfig }) {
  return (
    <div className="space-y-4">
      {config.description && (
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {config.description}
        </p>
      )}
      {config.notes && (
        <div className="bg-slate-50 dark:bg-gray-800 rounded-md p-3">
          {config.notes.split('\n').map((line, i) => (
            <p key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function CardTable({ config }: { config: PackConfig }) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse border border-gray-200 dark:border-gray-700">
          <thead>
            <tr className="bg-slate-50 dark:bg-gray-800">
              <th
                className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400"
                style={{ width: '20%' }}
              >
                희귀도
              </th>
              <th
                className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400"
                style={{ width: '65%' }}
              >
                카드
              </th>
              <th
                className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-right font-medium text-gray-600 dark:text-gray-400"
                style={{ width: '15%' }}
              >
                확률
              </th>
            </tr>
          </thead>
          <tbody>
            {config.groups!.map((group) =>
              group.cards.map((card, i) => (
                <tr
                  key={`${group.rankLabel}-${card.name}`}
                  className="hover:bg-slate-50 dark:hover:bg-gray-800/50"
                >
                  {i === 0 && (
                    <td
                      rowSpan={group.cards.length}
                      className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-yellow-600 dark:text-yellow-400 font-medium align-middle"
                    >
                      {group.rankLabel}
                    </td>
                  )}
                  <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-gray-800 dark:text-gray-200">
                    {card.name}
                  </td>
                  {i === 0 && (
                    <td
                      rowSpan={group.cards.length}
                      className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right text-gray-700 dark:text-gray-300 align-middle"
                    >
                      {group.rankProb}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {config.notes && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{config.notes}</p>
      )}
    </div>
  )
}

function BundleTable({ config }: { config: PackConfig }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse border border-gray-200 dark:border-gray-700">
        <thead>
          <tr className="bg-slate-50 dark:bg-gray-800">
            <th className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
              아이템 명칭
            </th>
            <th
              className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-right font-medium text-gray-600 dark:text-gray-400"
              style={{ width: '20%' }}
            >
              확률
            </th>
          </tr>
        </thead>
        <tbody>
          {config.items!.map((item) => (
            <tr
              key={item.name}
              className="hover:bg-slate-50 dark:hover:bg-gray-800/50"
            >
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-gray-800 dark:text-gray-200">
                {item.name}
              </td>
              <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">
                {item.prob}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
