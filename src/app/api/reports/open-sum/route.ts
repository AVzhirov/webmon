import { NextRequest, NextResponse } from 'next/server';
import { parseOpenSumReport } from '@/lib/rk7/reports';
import { withDemoDelay } from '../_helpers';

export async function GET(_req: NextRequest) {
  try {
    const data = await parseOpenSumReport();
    return withDemoDelay(NextResponse.json(data));
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to load open sum report', detail: String(e) },
      { status: 500 },
    );
  }
}
