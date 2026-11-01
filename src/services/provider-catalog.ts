import { catalogSchema } from '@/lib/provider-config';
export async function loadProviderCatalog(signal?: AbortSignal) {
  const response = await fetch('/api/catalog', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('โหลดการตั้งค่าผู้ให้บริการไม่สำเร็จ');
  return catalogSchema.parse(await response.json());
}
