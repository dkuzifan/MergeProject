import Link from 'next/link'

const QA = [
  {
    q: '환불 신청은 어떻게 하나요?',
    a: '환불은 구매일로부터 7일 이내에 고객지원 센터를 통해 신청하실 수 있습니다. Contact Us 폼에서 토픽을 "Purchases"로 선택 후 구매 정보를 기재해 주세요.',
  },
  {
    q: '환불에 필요한 서류가 있나요?',
    a: '환불 신청 시 아래 서류를 첨부하시면 처리가 빠릅니다: 결제 영수증 스크린샷, 계정 ID 또는 이메일, 문제 발생 시점의 화면 캡처(선택).',
  },
  {
    q: '환불이 불가한 경우는 언제인가요?',
    a: '다음에 해당하는 경우 환불이 제한될 수 있습니다: 이미 사용(소비)된 재화, 이벤트 보상으로 지급된 아이템, 구매일로부터 7일이 경과한 경우, 계정 이용 정지가 확인된 경우.',
  },
  {
    q: '환불 처리 기간은 얼마나 걸리나요?',
    a: '서류 확인 완료 후 영업일 기준 3~5일 내에 원결제 수단으로 환불 처리됩니다. 카드사 내부 정책에 따라 실제 계좌 반영은 1~2주 추가 소요될 수 있습니다.',
  },
  {
    q: '환불 신청 후 진행 상황은 어떻게 확인하나요?',
    a: '신청 시 등록하신 이메일로 처리 단계별 안내 메일이 발송됩니다. 추가 문의는 동일 이메일 스레드로 회신해 주세요.',
  },
]

export default function RefundGuidesPage() {
  return (
    <div>
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#1d4ed8] py-10 px-6">
        <p className="text-xs text-white/60 mb-3">
          <Link href="/cs" className="hover:text-white transition-colors">
            CS 홈
          </Link>{' '}
          &rsaquo; Refund Guides
        </p>
        <h1 className="text-2xl font-extrabold text-white mb-1">
          📄 Refund Guides
        </h1>
        <p className="text-white/70 text-sm">환불 절차 및 필요 서류 안내</p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-0">
          {QA.map((item, i) => (
            <div key={i}>
              <div className="py-6">
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-3 flex gap-2">
                  <span className="text-blue-500 font-bold">Q.</span>
                  {item.q}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed pl-5">
                  {item.a}
                </p>
              </div>
              {i < QA.length - 1 && (
                <hr className="border-gray-100 dark:border-gray-800" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            환불 관련 추가 문의가 있으신가요?
          </p>
          <Link
            href="/cs/contact"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            📬 문의하기
          </Link>
        </div>
      </div>
    </div>
  )
}
