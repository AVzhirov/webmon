import { NextRequest, NextResponse } from 'next/server';
import { parseBalanceReport } from '@/lib/rk7/reports';
import { withDemoDelay } from '../_helpers';

export async function GET(_req: NextRequest) {
  try {
    const data = await parseBalanceReport();
    return withDemoDelay(NextResponse.json(data));
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to load balance report', detail: String(e) },
      { status: 500 },
    );
  }
}
