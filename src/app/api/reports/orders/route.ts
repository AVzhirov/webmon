import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-utils'
import { parseOrdersReport } from '@/lib/rk7/reports';
import { withDemoDelay } from '../_helpers';

export async function GET(_req: NextRequest) {
  try {
    const data = await parseOrdersReport();
    return withDemoDelay(NextResponse.json(data));
  } catch (e) {
    return errorResponse('Failed to load orders', 500, e);
  }
}
