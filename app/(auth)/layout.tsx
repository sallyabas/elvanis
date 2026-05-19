// Minimal auth layout — each auth page controls its own full-page visual
// No header, no centering, no Tailwind interference
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
