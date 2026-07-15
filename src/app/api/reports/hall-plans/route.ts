import { NextRequest, NextResponse } from 'next/server';
import { parseHallPlans, parseHallTables } from '@/lib/rk7/reports';
import { withDemoDelay } from '../_helpers';

export async function GET(req: NextRequest) {
  try {
    const hallId = req.nextUrl.searchParams.get('id');
    if (hallId !== null) {
      const data = await parseHallTables(Number(hallId));
      return withDemoDelay(NextResponse.json(data ?? { tables: [] }));
    }
    const data = await parseHallPlans();
    return withDemoDelay(NextResponse.json(data));
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to load hall plans', detail: String(e) },
      { status: 500 },
    );
  }
}
