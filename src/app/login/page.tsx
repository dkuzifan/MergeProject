'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

// 로그인 페이지 상태 정의
// email_input  : 이메일 입력 (초기 화면)
// checking     : 서버에서 유저 존재 여부 확인 중
// pin_input    : 재방문 유저 — PIN 입력
// magic_sent   : 신규 유저 — Magic Link 발송 완료
// pin_setup    : Magic Link 인증 후 — 최초 PIN 설정
type State = 'email_input' | 'checking' | 'pin_input' | 'magic_sent' | 'pin_setup'

export default function LoginPage() {
  const router = useRouter()
  const [state, setState] = useState<State>(() => {
    if (typeof window === 'undefined') return 'email_input'
    const params = new URLSearchParams(window.location.search)
    if (params.get('setup') === 'pin') return 'pin_setup'
    return 'email_input'
  })
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [errorMsg, setErrorMsg] = useState(() => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams(window.location.search)
    return params.get('error') === 'expired'
      ? '인증 링크가 만료되었습니다. 다시 시도해주세요.'
      : ''
  })

  // ── 1단계: 이메일 제출 → 신규/재방문 분기 ──────────────────────
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.endsWith('@storytaco.com')) {
      setErrorMsg('스토리타코 이메일(@storytaco.com)만 로그인 가능합니다')
      return
    }
    setErrorMsg('')
    setState('checking')

    try {
      const res = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (data.exists && data.hasPin) {
        // 재방문 유저 → PIN 입력 화면
        setState('pin_input')
      } else {
        // 신규 유저 or PIN 미설정 → Magic Link 발송
        await sendMagicLink()
      }
    } catch {
      setErrorMsg('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setState('email_input')
    }
  }

  // Magic Link 발송
  async function sendMagicLink() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setErrorMsg(
        error.status === 429
          ? '잠시 후 다시 시도해주세요. (발송 횟수 초과)'
          : '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'
      )
      setState('email_input')
      return
    }
    setState('magic_sent')
  }

  // ── 2a단계: PIN 입력 → 검증 → 로그인 ───────────────────────────
  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4) return
    setErrorMsg('')
    setState('checking')

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'PIN이 올바르지 않습니다')
        setState('pin_input')
        setPin('')
        return
      }

      // 서버에서 받은 token으로 세션 생성
      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.verifyOtp({
        email,
        token: data.token,
        type: 'email',
      })

      if (sessionError) {
        setErrorMsg('로그인에 실패했습니다. 다시 시도해주세요.')
        setState('pin_input')
        setPin('')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setErrorMsg('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setState('pin_input')
      setPin('')
    }
  }

  // ── 2b단계: Magic Link 인증 후 PIN 최초 설정 ────────────────────
  // (이 화면은 /auth/callback 이후 리디렉션된 경우에만 표시)
  async function handlePinSetup(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4) return
    setErrorMsg('')
    setState('checking')

    try {
      const res = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'PIN 저장에 실패했습니다')
        setState('pin_setup')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setErrorMsg('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setState('pin_setup')
    }
  }

  // ── UI 렌더링 ───────────────────────────────────────────────────

  // 로딩 (checking)
  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl p-12 w-full max-w-md shadow-2xl text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">확인 중...</p>
        </div>
      </div>
    )
  }

  // Magic Link 발송 완료
  if (state === 'magic_sent') {
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
            인증 후 PIN 번호를 설정하게 됩니다
          </p>
          <button
            onClick={() => { setState('email_input'); setPin('') }}
            className="mt-4 text-sm text-blue-500 underline hover:text-blue-700"
          >
            다시 보내기
          </button>
        </div>
      </div>
    )
  }

  // PIN 최초 설정 (Magic Link 인증 완료 후)
  if (state === 'pin_setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-12 w-full max-w-md shadow-2xl">
          <div className="flex flex-col items-center mb-8 gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-widest shadow-lg">
              MERGE
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-800">PIN 번호 설정</h1>
              <p className="text-sm text-gray-500 mt-1">다음 로그인부터 사용할 4자리 PIN을 설정하세요</p>
            </div>
          </div>

          <form onSubmit={handlePinSetup}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                PIN 번호 (4자리)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErrorMsg('') }}
                placeholder="••••"
                className={`w-full px-3.5 py-2.5 border-[1.5px] rounded-xl text-sm text-center tracking-widest outline-none transition-colors bg-gray-50 text-xl
                  ${errorMsg ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:bg-white'}`}
              />
              {errorMsg && (
                <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                  <span>⚠</span> {errorMsg}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={pin.length !== 4}
              className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl mt-1
                hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              PIN 설정 완료
            </button>
          </form>
        </div>
      </div>
    )
  }

  // PIN 입력 (재방문 유저)
  if (state === 'pin_input') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-12 w-full max-w-md shadow-2xl">
          <div className="flex flex-col items-center mb-8 gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-widest shadow-lg">
              MERGE
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800">머지팀 작업실</h1>
              <p className="text-sm text-gray-500 mt-1">PIN 번호를 입력해주세요</p>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 bg-gray-50 rounded-xl py-2 mb-4">
            {email}
          </p>

          <form onSubmit={handlePinSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                PIN 번호 (4자리)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErrorMsg('') }}
                placeholder="••••"
                autoFocus
                className={`w-full px-3.5 py-2.5 border-[1.5px] rounded-xl text-sm text-center tracking-widest outline-none transition-colors bg-gray-50 text-xl
                  ${errorMsg ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:bg-white'}`}
              />
              {errorMsg && (
                <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                  <span>⚠</span> {errorMsg}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={pin.length !== 4}
              className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl mt-1
                hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              로그인
            </button>
          </form>

          <button
            onClick={() => { setState('email_input'); setPin(''); setErrorMsg('') }}
            className="w-full text-center text-xs text-gray-400 mt-4 hover:text-gray-600"
          >
            ← 이메일 다시 입력
          </button>
        </div>
      </div>
    )
  }

  // 이메일 입력 (기본 화면)
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-12 w-full max-w-md shadow-2xl">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-widest shadow-lg">
            MERGE
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800">머지팀 작업실</h1>
            <p className="text-sm text-gray-500 mt-1">타코메일로 로그인해주세요</p>
          </div>
        </div>

        <form onSubmit={handleEmailSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMsg('') }}
              placeholder="name@storytaco.com"
              className={`w-full px-3.5 py-2.5 border-[1.5px] rounded-xl text-sm outline-none transition-colors bg-gray-50
                ${errorMsg ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:bg-white'}`}
            />
            {errorMsg && (
              <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                <span>⚠</span> {errorMsg}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={!email}
            className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl mt-1
              hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            계속
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          처음 방문이라면 이메일로 인증 후 PIN을 설정합니다
        </p>
      </div>
    </div>
  )
}
