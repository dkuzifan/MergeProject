import type { CsArticle, SearchResult } from '../types'

export const ARTICLES: CsArticle[] = [
  // ── How to Play ──────────────────────────────────────────────
  {
    id: 'htp-01',
    title: '게임 시작하기',
    excerpt: '처음 게임을 시작하는 방법과 튜토리얼 안내입니다.',
    body: '게임을 처음 실행하면 튜토리얼이 자동으로 시작됩니다. 튜토리얼을 완료하면 기본 조작법과 게임 규칙을 익힐 수 있습니다. 튜토리얼은 설정 메뉴에서 다시 시작할 수 있습니다.',
    tags: ['시작', '튜토리얼', '초보자', 'beginner'],
    category: 'how-to-play',
    href: '/cs/how-to-play',
  },
  {
    id: 'htp-02',
    title: '기본 조작법 안내',
    excerpt: '게임 내 이동, 공격, 아이템 사용 등 기본 조작을 설명합니다.',
    body: '이동은 방향키 또는 조이스틱으로 합니다. 공격은 A 버튼, 아이템 사용은 B 버튼입니다. 설정에서 키 배열을 변경할 수 있습니다.',
    tags: ['조작', '컨트롤', '키보드', '버튼'],
    category: 'how-to-play',
    href: '/cs/how-to-play',
  },
  {
    id: 'htp-03',
    title: '게임 모드 소개',
    excerpt: '스토리, 배틀, 협동 등 다양한 게임 모드를 소개합니다.',
    body: '스토리 모드는 싱글 플레이어 캠페인입니다. 배틀 모드는 다른 플레이어와 대전합니다. 협동 모드는 최대 4인이 함께 진행합니다.',
    tags: ['모드', '스토리', '배틀', '협동'],
    category: 'how-to-play',
    href: '/cs/how-to-play',
  },
  {
    id: 'htp-04',
    title: '아이템 사용 방법',
    excerpt: '인벤토리에서 아이템을 확인하고 사용하는 방법을 안내합니다.',
    body: '인벤토리는 화면 우측 상단 가방 아이콘을 탭하면 열립니다. 아이템을 길게 누르면 사용 또는 장착할 수 있습니다. 소모성 아이템은 사용 후 사라집니다.',
    tags: ['아이템', '인벤토리', '장착'],
    category: 'how-to-play',
    href: '/cs/how-to-play',
  },
  {
    id: 'htp-05',
    title: '점수 획득 및 랭킹 시스템',
    excerpt: '게임 내 점수를 획득하고 랭킹에 반영되는 방식을 설명합니다.',
    body: '점수는 스테이지 클리어, 콤보, 보너스 조건 달성 시 획득합니다. 주간 랭킹은 매주 월요일 오전 9시에 초기화됩니다. 상위 랭커에게는 특별 보상이 지급됩니다.',
    tags: ['점수', '랭킹', '리더보드', '보너스'],
    category: 'how-to-play',
    href: '/cs/how-to-play',
  },

  // ── Events ────────────────────────────────────────────────────
  {
    id: 'evt-01',
    title: '현재 진행 중인 이벤트 목록',
    excerpt: '지금 참가할 수 있는 이벤트를 확인하세요.',
    body: '진행 중인 이벤트는 메인 화면 이벤트 배너 또는 이벤트 탭에서 확인할 수 있습니다. 이벤트마다 참가 조건과 보상이 다르므로 반드시 상세 페이지를 확인하세요.',
    tags: ['이벤트', '진행중', '배너'],
    category: 'events',
    href: '/cs/events',
  },
  {
    id: 'evt-02',
    title: '이벤트 참가 방법',
    excerpt: '이벤트에 참가하기 위한 조건과 절차를 안내합니다.',
    body: '대부분의 이벤트는 별도 신청 없이 조건 달성 시 자동으로 참가됩니다. 일부 특별 이벤트는 이벤트 페이지에서 "참가하기" 버튼을 눌러야 합니다.',
    tags: ['이벤트', '참가', '신청'],
    category: 'events',
    href: '/cs/events',
  },
  {
    id: 'evt-03',
    title: '이벤트 보상 수령 방법',
    excerpt: '이벤트 완료 후 보상을 받는 방법을 안내합니다.',
    body: '이벤트 보상은 조건 달성 후 우편함으로 자동 지급됩니다. 우편함 아이템은 수령 기한이 있으니 기간 내에 수령하세요. 기한 초과 시 자동 삭제됩니다.',
    tags: ['이벤트', '보상', '우편함', '수령'],
    category: 'events',
    href: '/cs/events',
  },
  {
    id: 'evt-04',
    title: '이벤트 기간 및 종료 처리',
    excerpt: '이벤트가 종료되면 진행 중인 미션과 보상이 어떻게 처리되는지 안내합니다.',
    body: '이벤트 종료 시 미완료 미션은 자동 소멸됩니다. 종료 전 달성한 보상은 우편함에서 7일간 수령 가능합니다. 이벤트 종료 전 미리 확인하세요.',
    tags: ['이벤트', '종료', '기간', '만료'],
    category: 'events',
    href: '/cs/events',
  },
  {
    id: 'evt-05',
    title: '이벤트 알림 받기',
    excerpt: '새 이벤트 시작 시 푸시 알림을 설정하는 방법입니다.',
    body: '설정 → 알림 → 이벤트 알림을 활성화하면 이벤트 시작·종료 임박 시 알림을 받을 수 있습니다. 기기 알림 권한이 허용된 상태여야 합니다.',
    tags: ['이벤트', '알림', '푸시', '설정'],
    category: 'events',
    href: '/cs/events',
  },

  // ── Rewards ───────────────────────────────────────────────────
  {
    id: 'rwd-01',
    title: '보상 지급 기준 안내',
    excerpt: '어떤 경우에 보상이 지급되는지 기준을 설명합니다.',
    body: '보상은 퀘스트 완료, 이벤트 달성, 레벨업, 출석 체크, 랭킹 보상 등 다양한 경로로 지급됩니다. 각 보상의 지급 조건은 해당 미션 또는 이벤트 상세 페이지에서 확인하세요.',
    tags: ['보상', '지급', '기준', '퀘스트'],
    category: 'rewards',
    href: '/cs/rewards',
  },
  {
    id: 'rwd-02',
    title: '보상 수령 방법',
    excerpt: '획득한 보상을 실제로 받는 방법을 안내합니다.',
    body: '보상은 우편함 또는 업적 탭에서 수령할 수 있습니다. 우편함은 홈 화면 좌측 상단 편지 아이콘을 탭하면 열립니다. "모두 받기" 버튼으로 한 번에 수령할 수 있습니다.',
    tags: ['보상', '수령', '우편함', '업적'],
    category: 'rewards',
    href: '/cs/rewards',
  },
  {
    id: 'rwd-03',
    title: '보상 만료 기간',
    excerpt: '수령하지 않은 보상에 유효 기간이 있는지 안내합니다.',
    body: '우편함의 보상 아이템은 수신 후 30일 이내에 수령해야 합니다. 일부 한정 이벤트 보상은 7일의 짧은 유효기간이 적용됩니다. 만료된 아이템은 복구되지 않습니다.',
    tags: ['보상', '만료', '기간', '유효기간'],
    category: 'rewards',
    href: '/cs/rewards',
  },
  {
    id: 'rwd-04',
    title: '보상이 지급되지 않을 때',
    excerpt: '보상을 받지 못한 경우 확인할 사항과 해결 방법을 안내합니다.',
    body: '보상 지급은 최대 24시간이 소요될 수 있습니다. 그 이후에도 미지급 시 고객지원 센터에 계정 ID, 발생 날짜, 달성 조건을 포함하여 문의하세요.',
    tags: ['보상', '미지급', '오류', '지연'],
    category: 'rewards',
    href: '/cs/rewards',
  },
  {
    id: 'rwd-05',
    title: '레벨업 보상 안내',
    excerpt: '레벨이 오를 때 지급되는 보상 목록을 확인하세요.',
    body: '레벨 10, 20, 30... 10 단위 레벨마다 특별 보상이 지급됩니다. 레벨업 보상은 자동으로 우편함으로 발송됩니다. 보상 목록은 설정 → 레벨 보상 탭에서 미리 확인할 수 있습니다.',
    tags: ['보상', '레벨업', '레벨'],
    category: 'rewards',
    href: '/cs/rewards',
  },

  // ── Purchases ─────────────────────────────────────────────────
  {
    id: 'pch-01',
    title: '환불 신청 방법 및 처리 기간',
    excerpt: '인앱 결제 환불을 신청하는 절차와 소요 기간을 안내합니다.',
    body: '환불은 구매일로부터 7일 이내에 신청하실 수 있습니다. Contact Us 폼에서 토픽을 Purchases로 선택 후 구매 영수증 정보를 포함해 문의하세요. 처리는 영업일 기준 3~5일 소요됩니다.',
    tags: ['환불', '결제', '신청', 'refund'],
    category: 'purchases',
    href: '/cs/purchases',
  },
  {
    id: 'pch-02',
    title: '환불 불가 항목 안내',
    excerpt: '환불이 제한되는 경우를 미리 확인하세요.',
    body: '다음 경우에는 환불이 제한됩니다: 이미 사용(소비)된 재화, 이벤트 보상으로 지급된 아이템, 구매일로부터 7일이 경과한 경우, 계정 이용 정지가 확인된 경우.',
    tags: ['환불', '불가', '제한', 'refund'],
    category: 'purchases',
    href: '/cs/purchases',
  },
  {
    id: 'pch-03',
    title: '결제 오류 발생 시 대처법',
    excerpt: '결제는 됐는데 아이템을 받지 못한 경우 해결 방법을 안내합니다.',
    body: '결제는 완료되었으나 아이템을 받지 못한 경우 환불 또는 재지급 처리가 가능합니다. 고객지원 센터에 결제 영수증 스크린샷과 계정 ID를 첨부해 문의하세요.',
    tags: ['결제', '오류', '재지급', '누락'],
    category: 'purchases',
    href: '/cs/purchases',
  },
  {
    id: 'pch-04',
    title: '구독 상품 해지 방법',
    excerpt: '월정액 구독을 해지하는 방법을 안내합니다.',
    body: '구독 해지는 각 앱 스토어에서 처리해야 합니다. iOS: App Store → 계정 → 구독 관리 / Android: Google Play → 구독. 다음 갱신일 전까지 해지해야 다음 달 요금이 청구되지 않습니다.',
    tags: ['구독', '해지', '정기결제', '취소'],
    category: 'purchases',
    href: '/cs/purchases',
  },
  {
    id: 'pch-05',
    title: '결제 수단 변경 안내',
    excerpt: '등록된 결제 수단을 변경하는 방법을 안내합니다.',
    body: '결제 수단 변경은 각 앱 스토어 계정 설정에서 가능합니다. 게임 내에서 직접 결제 수단을 변경하는 기능은 제공되지 않습니다. 앱 스토어 고객센터에 문의하시면 더 자세한 안내를 받으실 수 있습니다.',
    tags: ['결제', '수단', '변경', '카드'],
    category: 'purchases',
    href: '/cs/purchases',
  },

  // ── Account & Device ──────────────────────────────────────────
  {
    id: 'acc-01',
    title: '계정 생성 및 로그인',
    excerpt: '새 계정을 만들고 로그인하는 방법을 안내합니다.',
    body: '계정은 이메일 또는 소셜 계정(Google, Apple)으로 생성할 수 있습니다. 로그인 화면에서 원하는 방식을 선택하세요. 이미 계정이 있다면 동일한 방식으로 로그인하면 기존 데이터가 불러와집니다.',
    tags: ['계정', '로그인', '가입', '소셜'],
    category: 'account-device',
    href: '/cs/account-device',
  },
  {
    id: 'acc-02',
    title: '비밀번호 변경 방법',
    excerpt: '계정 비밀번호를 변경하는 방법을 안내합니다.',
    body: '설정 → 계정 → 비밀번호 변경에서 현재 비밀번호 확인 후 새 비밀번호를 설정할 수 있습니다. 비밀번호를 잊어버린 경우 로그인 화면에서 "비밀번호 찾기"를 이용하세요.',
    tags: ['비밀번호', '변경', '계정', '보안'],
    category: 'account-device',
    href: '/cs/account-device',
  },
  {
    id: 'acc-03',
    title: '기기 변경 시 계정 이전',
    excerpt: '새 기기로 교체할 때 게임 데이터를 이전하는 방법입니다.',
    body: '게임 데이터는 계정에 연동되어 클라우드에 저장됩니다. 새 기기에서 기존 계정으로 로그인하면 자동으로 데이터가 복원됩니다. 반드시 게임 종료 전 계정 연동(이메일 또는 소셜)을 확인하세요.',
    tags: ['기기', '이전', '계정', '클라우드', '데이터'],
    category: 'account-device',
    href: '/cs/account-device',
  },
  {
    id: 'acc-04',
    title: '계정 보안 강화 방법',
    excerpt: '2단계 인증 등 계정 보안을 강화하는 방법을 안내합니다.',
    body: '설정 → 보안에서 2단계 인증을 활성화할 수 있습니다. 비밀번호는 영문·숫자·특수문자를 포함한 8자 이상을 권장합니다. 다른 사람과 계정 정보를 공유하지 마세요.',
    tags: ['보안', '2단계인증', '계정', '비밀번호'],
    category: 'account-device',
    href: '/cs/account-device',
  },
  {
    id: 'acc-05',
    title: '계정 탈퇴 및 삭제',
    excerpt: '게임 계정을 영구 삭제하는 방법과 주의사항을 안내합니다.',
    body: '계정 탈퇴는 설정 → 계정 → 계정 삭제에서 신청할 수 있습니다. 삭제 후 30일 이내에는 복구 요청이 가능합니다. 30일 경과 후에는 모든 데이터가 영구 삭제되며 복구할 수 없습니다.',
    tags: ['탈퇴', '삭제', '계정', '복구'],
    category: 'account-device',
    href: '/cs/account-device',
  },

  // ── Etc ───────────────────────────────────────────────────────
  {
    id: 'etc-01',
    title: '서비스 이용 약관 안내',
    excerpt: '게임 서비스 이용 시 적용되는 약관 내용을 안내합니다.',
    body: '서비스 이용 약관은 설정 → 법적 정보 → 이용 약관에서 확인할 수 있습니다. 약관은 서비스 개선에 따라 변경될 수 있으며, 변경 시 사전 고지합니다.',
    tags: ['약관', '이용약관', '정책'],
    category: 'etc',
    href: '/cs/etc',
  },
  {
    id: 'etc-02',
    title: '개인정보 처리 방침',
    excerpt: '수집하는 개인정보와 처리 방법을 안내합니다.',
    body: '당사는 서비스 제공을 위해 최소한의 개인정보만 수집합니다. 개인정보는 수집 목적 외 사용되지 않으며 제3자에게 제공되지 않습니다. 자세한 내용은 설정 → 법적 정보 → 개인정보 처리 방침에서 확인하세요.',
    tags: ['개인정보', '방침', '정책', 'privacy'],
    category: 'etc',
    href: '/cs/etc',
  },
  {
    id: 'etc-03',
    title: '게임 버그 신고 방법',
    excerpt: '게임 내 버그를 발견했을 때 신고하는 방법을 안내합니다.',
    body: 'Contact Us 폼에서 토픽을 Technical로 선택하고 버그 발생 상황, 재현 방법, 기기 정보를 상세히 작성해 주세요. 화면 캡처나 녹화 파일을 첨부하면 더 빠른 처리에 도움이 됩니다.',
    tags: ['버그', '신고', '오류', 'bug'],
    category: 'etc',
    href: '/cs/etc',
  },
  {
    id: 'etc-04',
    title: '피드백 및 건의사항 접수',
    excerpt: '게임 개선 아이디어나 피드백을 전달하는 방법입니다.',
    body: 'Contact Us 폼에서 토픽을 Feedback & Suggestions로 선택하면 됩니다. 여러분의 의견은 개발팀에 전달되어 게임 개선에 반영됩니다. 모든 피드백을 소중히 검토합니다.',
    tags: ['피드백', '건의', '개선', '의견'],
    category: 'etc',
    href: '/cs/etc',
  },
  {
    id: 'etc-05',
    title: '고객지원 운영 시간',
    excerpt: '고객지원 센터 운영 시간과 답변 소요 기간을 안내합니다.',
    body: '고객지원 센터는 평일 오전 10시 ~ 오후 6시(KST)에 운영됩니다. 문의 접수 후 영업일 기준 1~3일 내에 이메일로 답변드립니다. 공휴일 및 주말에는 답변이 지연될 수 있습니다.',
    tags: ['운영시간', '고객지원', '답변', '문의'],
    category: 'etc',
    href: '/cs/etc',
  },
]

export function searchArticles(query: string): SearchResult[] {
  if (!query.trim()) return []

  const q = query.toLowerCase()
  const titleMatches: SearchResult[] = []
  const bodyMatches: SearchResult[] = []
  const tagMatches: SearchResult[] = []
  const seen = new Set<string>()

  for (const article of ARTICLES) {
    if (article.title.toLowerCase().includes(q)) {
      titleMatches.push({ article, matchType: 'title' })
      seen.add(article.id)
    }
  }

  for (const article of ARTICLES) {
    if (seen.has(article.id)) continue
    if (
      article.body.toLowerCase().includes(q) ||
      article.excerpt.toLowerCase().includes(q)
    ) {
      bodyMatches.push({ article, matchType: 'body' })
      seen.add(article.id)
    }
  }

  for (const article of ARTICLES) {
    if (seen.has(article.id)) continue
    if (article.tags.some((tag) => tag.toLowerCase().includes(q))) {
      tagMatches.push({ article, matchType: 'tag' })
    }
  }

  return [...titleMatches, ...bodyMatches, ...tagMatches]
}
