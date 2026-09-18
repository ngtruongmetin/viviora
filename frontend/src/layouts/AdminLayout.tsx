import type { ReactNode } from 'react';
import { MemberLayout } from './MemberLayout';
export function AdminLayout({ children }: { children: ReactNode }) {
  return <MemberLayout>{children}</MemberLayout>;
}
