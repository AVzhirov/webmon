import { NextResponse } from 'next/server';

/** Имитация сетевой задержки, чтобы видеть skeleton-загрузку в UI. */
export async function withDemoDelay<T extends NextResponse>(resp: T, ms = 120): Promise<T> {
  await new Promise((r) => setTimeout(r, ms));
  return resp;
}
