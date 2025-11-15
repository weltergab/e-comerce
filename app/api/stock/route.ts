import { NextResponse } from 'next/server';
import { getAllStock } from '@/lib/services/stock';

export async function GET() {
  try {
    const stock = await getAllStock();
    console.log('📊 API /stock called - Current stock:', stock);
    return NextResponse.json({ stock });
  } catch (error) {
    console.error('❌ Error fetching stock:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock' },
      { status: 500 }
    );
  }
}
