import { NextRequest, NextResponse } from 'next/server';
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
    return NextResponse.json(
      { error: 'Failed to load checks', detail: String(e) },
      { status: 500 },
    );
  }
}
