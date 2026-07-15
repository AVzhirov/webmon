import { NextResponse } from 'next/server';
import type { RKServer } from '@/lib/rk7/types';

// Демо-список серверов (имитация servers.xml)
const DEMO_SERVERS: RKServer[] = [
  {
    id: 'demo-1',
    name: 'Обучение',
    address: '172.22.5.199:15551',
    status: 'demo',
    version: 'RK7 DEMO',
  },
  {
    id: 'demo-2',
    name: 'Test',
    address: '172.22.3.185:14567',
    status: 'demo',
    version: 'RK7 DEMO',
  },
];

export async function GET() {
  return NextResponse.json(DEMO_SERVERS);
}
