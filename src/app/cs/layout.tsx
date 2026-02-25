import CsFooter from './components/CsFooter'

export default function CsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-950">
      <div className="flex-1">{children}</div>
      <CsFooter />
    </div>
  )
}
