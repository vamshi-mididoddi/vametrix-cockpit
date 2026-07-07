import { redirect } from 'next/navigation';

// Legacy engine overview retired 2026-07-07 — VAMETRIX Sales is the product.
export default function DashboardRedirect() {
  redirect('/sales');
}