import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-utils'
import { parseMoneyByPerson } from '@/lib/rk7/reports';
import { withDemoDelay } from '../_helpers';

export async function GET(_req: NextRequest) {
  try {
    const data = await parseMoneyByPerson('MoneyByCache.xml');
    return withDemoDelay(NextResponse.json(data));
  } catch (e) {
    return errorResponse('Failed to load cashiers report', 500, e);
  }
}
