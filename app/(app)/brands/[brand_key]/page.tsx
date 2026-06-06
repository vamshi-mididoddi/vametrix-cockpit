import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { BrandEditorClient } from './client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({ params }: { params: { brand_key: string } }) {
  await requireAdmin();
  const supa = supabaseAdmin();
  const { data: brand, error } = await supa.from('brand_profiles').select('*').eq('brand_key', params.brand_key).maybeSingle();
  if (error || !brand) notFound();

  return (
    <>
      <TopBar title={`${brand.brand_label} · brand context`} breadcrumb="Marketing Brain · Brands" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <BrandEditorClient brand={brand} />
      </div>
    </>
  );
}
