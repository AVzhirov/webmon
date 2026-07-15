import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-utils'
import { parseCheckList, parseCheckDetail } from '@/lib/rk7/reports';
import { withDemoDelay } from '../_helpers';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (id) {
      const data = await parseCheckDetail(Number(id));
      if (!data) {
        return NextResponse.json({ error: 'Check not found' }, { status: 404 });
      }
      return withDemoDelay(NextResponse.json(data));
    }
    const data = await parseCheckList();
    return withDemoDelay(NextResponse.json(data));
  } catch (e) {
    return errorResponse('Failed to load checks', 500, e);
  }
}
