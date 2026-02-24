import { cookies } from 'next/headers';
import DashboardHeader from './DashboardHeader';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  let role = null;
  let fullName = null;
  if (accessToken) {
    try {
      const r = await fetch(`${API_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (r.ok) {
        const data = await r.json();
        role = data.role;
        fullName = data.fullName;
      }
    } catch {}
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {role && <DashboardHeader role={role} fullName={fullName} />}
        {children}
      </div>
    </div>
  );
}
