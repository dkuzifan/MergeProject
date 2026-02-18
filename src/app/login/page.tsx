'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type State = 'idle' | 'loading' | 'sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  // /login?error=expired 쿼리 파라미터가 있으면 초기 에러 메시지로 설정
  const [errorMsg, setErrorMsg] = useState(() => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams(window.location.search)
    return params.get('error') === 'expired'
      ? '인증 링크가 만료되었습니다. 다시 시도해주세요.'
      : ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // 클라이언트 레벨 도메인 검증
    if (!email.endsWith('@storytaco.com')) {
      setErrorMsg('스토리타코 이메일(@storytaco.com)만 로그인 가능합니다')
      return
    }

    setErrorMsg('')
    setState('loading')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      // Rate Limit (429) 처리
      if (error.status === 429) {
        setErrorMsg('잠시 후 다시 시도해주세요. (발송 횟수 초과)')
      } else {
        setErrorMsg('이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
      setState('idle')
      return
    }

    setState('sent')
  }

  // 발송 완료 화면
  if (state === 'sent') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-12 w-full max-w-md shadow-2xl text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-5">
            ✉️
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">이메일을 보냈습니다</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            아래 메일함을 확인하고<br />인증 버튼을 눌러주세요
          </p>
          <span className="inline-block bg-blue-50 text-blue-600 font-semibold text-sm px-4 py-1.5 rounded-full mb-5">
            {email}
          </span>
          <p className="text-gray-400 text-xs">
            메일이 오지 않으면 스팸 폴더를 확인해보세요.
          </p>
          <button
            onClick={() => { setState('idle'); setErrorMsg('') }}
            className="mt-4 text-sm text-blue-500 underline hover:text-blue-700"
          >
            다시 보내기
          </button>
        </div>
      </div>
    )
  }

  // 이메일 입력 폼
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-12 w-full max-w-md shadow-2xl">

        {/* 로고 */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-widest shadow-lg">
            MERGE
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800">머지팀 작업실</h1>
            <p className="text-sm text-gray-500 mt-1">타코메일로 로그인해주세요</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrorMsg('')
              }}
              placeholder="name@storytaco.com"
              className={`w-full px-3.5 py-2.5 border-[1.5px] rounded-xl text-sm outline-none transition-colors bg-gray-50
                ${errorMsg
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-200 focus:border-blue-500 focus:bg-white'
                }`}
            />
            {errorMsg && (
              <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                <span>⚠</span> {errorMsg}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!email || state === 'loading'}
            className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl mt-1
              hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors
              flex items-center justify-center gap-2"
          >
            {state === 'loading' ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                발송 중...
              </>
            ) : (
              '로그인 링크 받기'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          비밀번호 없이 메일로 인증합니다
        </p>
      </div>
    </div>
  )
}
