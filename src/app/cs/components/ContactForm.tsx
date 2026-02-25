'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { CONTACT_TOPICS } from '../types'

function todayString() {
  return new Date().toISOString().split('T')[0]
}

export default function ContactForm() {
  const [dateOfIssue, setDateOfIssue] = useState(todayString())
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [emailConfirm, setEmailConfirm] = useState('')
  const [emailError, setEmailError] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const emailsMatch = email && emailConfirm && email === emailConfirm

  const isSubmittable =
    dateOfIssue &&
    topic &&
    description.trim() &&
    firstName.trim() &&
    email.trim() &&
    emailConfirm.trim() &&
    emailsMatch &&
    !emailError

  function handleEmailConfirmBlur() {
    if (emailConfirm && email !== emailConfirm) {
      setEmailError('이메일 주소가 일치하지 않습니다.')
    } else {
      setEmailError('')
    }
  }

  function handleEmailConfirmChange(v: string) {
    setEmailConfirm(v)
    if (emailError && email === v) setEmailError('')
  }

  function handleEmailChange(v: string) {
    setEmail(v)
    if (emailError) setEmailError('')
  }

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return
    const names = Array.from(newFiles).map((f) => f.name)
    setFiles((prev) => [...prev, ...names].slice(0, 5))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  async function handleSubmit() {
    if (!isSubmittable) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/cs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateOfIssue,
          topic,
          description,
          firstName,
          email,
          attachmentUrls: files,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setSubmitError(data.error ?? '제출 중 오류가 발생했습니다.')
        return
      }
      setSubmitted(true)
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-100 mb-3">
          Thank you for contacting us!
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          문의가 성공적으로 접수되었습니다.
          <br />
          검토 후 등록하신 이메일로 회신드리겠습니다.
          <br />
          <span className="text-xs text-gray-400 mt-1 inline-block">
            보통 영업일 기준 1~3일 내에 답변됩니다.
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Date of Issue */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
          Date of Issue <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={dateOfIssue}
          onChange={(e) => setDateOfIssue(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:border-blue-400 transition-colors"
        />
      </div>

      {/* Topic */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
          Topic <span className="text-red-500">*</span>
        </label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:border-blue-400 transition-colors"
        >
          <option value="">-- 토픽을 선택하세요 --</option>
          {CONTACT_TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="문제 상황을 자세히 설명해 주세요..."
          rows={5}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:border-blue-400 transition-colors resize-vertical"
        />
      </div>

      {/* Name + Email */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="이름"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:border-blue-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="이메일 주소"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:border-blue-400 transition-colors"
          />
        </div>
      </div>

      {/* Email Confirm */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
          Confirm Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={emailConfirm}
          onChange={(e) => handleEmailConfirmChange(e.target.value)}
          onBlur={handleEmailConfirmBlur}
          placeholder="이메일 주소 확인"
          className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none transition-colors ${
            emailError
              ? 'border-red-400 focus:border-red-400'
              : 'border-gray-200 dark:border-gray-700 focus:border-blue-400'
          }`}
        />
        {emailError && (
          <p className="text-xs text-red-500 mt-1">{emailError}</p>
        )}
      </div>

      {/* File Attachments */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
          Attachments
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <p className="text-2xl mb-2">📎</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            파일을 드래그하거나 클릭하여 첨부하세요
          </p>
          <p className="text-xs text-gray-400 mt-1">최대 5개 파일</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        {files.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {files.map((name, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg"
              >
                <span className="text-gray-700 dark:text-gray-300 truncate">{name}</span>
                <button
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-gray-400 hover:text-red-400 ml-2 flex-shrink-0 transition-colors"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/cs/refund-guides"
          className="text-xs text-blue-500 hover:underline mt-2 inline-block"
        >
          📄 Documentation required for refund
        </Link>
      </div>

      {/* Submit */}
      {submitError && (
        <p className="text-xs text-red-500 text-center">{submitError}</p>
      )}
      <button
        onClick={handleSubmit}
        disabled={!isSubmittable || submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white disabled:text-gray-400 dark:disabled:text-gray-500 font-bold py-3 rounded-xl text-sm transition-colors"
      >
        {submitting ? '제출 중...' : 'Submit'}
      </button>
      <p className="text-xs text-gray-400 text-center -mt-2">
        모든 필수 항목(*) 입력 및 이메일 일치 시 제출 가능합니다.
      </p>
    </div>
  )
}
