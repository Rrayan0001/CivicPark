import { CitizenBottomNav } from '@/components/shared/CitizenBottomNav'

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div style={{ flex: 1, paddingBottom: 64 }}>
        {children}
      </div>
      <CitizenBottomNav />
    </div>
  )
}
