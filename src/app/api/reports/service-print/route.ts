import { NextRequest, NextResponse } from 'next/server';
import { parseServicePrint } from '@/lib/rk7/reports';
import { withDemoDelay } from '../_helpers';

export async function GET(_req: NextRequest) {
  try {
    const data = await parseServicePrint();
    return withDemoDelay(NextResponse.json(data));
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to load service print report', detail: String(e) },
      { status: 500 },
    );
  }
}
