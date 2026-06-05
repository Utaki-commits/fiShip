import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ReservePageClient from '@/app/reserve/[vesselId]/ReservePageClient'

type Params = {
  slug: string
}

const BOOKING_LABEL = '\u4e57\u8239\u4e88\u7d04'
const OGP_DESCRIPTION = '\u7a7a\u304d\u65e5\u7a0b\u306e\u78ba\u8a8d\u30fb\u4e88\u7d04\u306f\u3053\u3061\u3089'

const getPublicClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const getVesselBySlug = async (slug: string) => {
  const { data, error } = await getPublicClient()
    .from('vessels')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as { id: string; name: string }
}

export async function generateMetadata({ params }: { params: Params }) {
  const vessel = await getVesselBySlug(params.slug)
  const shipName = vessel?.name || 'FiShip'

  return {
    title: `${shipName} | ${BOOKING_LABEL} - FiShip`,
    openGraph: {
      title: `${shipName}\u306e${BOOKING_LABEL}`,
      description: OGP_DESCRIPTION,
    },
  }
}

export default async function BookPage({ params }: { params: Params }) {
  const vessel = await getVesselBySlug(params.slug)
  if (!vessel) notFound()

  return <ReservePageClient vesselIdOverride={vessel.id} />
}
