import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { StaffMessage } from '@/lib/rk7/types';

const MESSAGES_FILE = path.join(process.cwd(), 'public', 'demo-data', 'messages.json');

async function readMessages(): Promise<StaffMessage[]> {
  try {
    const data = await fs.readFile(MESSAGES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeMessages(messages: StaffMessage[]): Promise<void> {
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
}

export async function GET() {
  const messages = await readMessages();
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipient, recipientCode, text } = body as {
      recipient: string;
      recipientCode?: number;
      text: string;
    };
    if (!recipient || !text) {
      return NextResponse.json(
        { error: 'Не заполнены получатель или текст сообщения' },
        { status: 400 },
      );
    }
    const messages = await readMessages();
    const newMsg: StaffMessage = {
      id: `msg-${Date.now()}`,
      recipient,
      recipientCode,
      text,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };
    messages.unshift(newMsg);
    await writeMessages(messages);
    return NextResponse.json(newMsg, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: 'Не удалось отправить сообщение', detail: String(e) },
      { status: 500 },
    );
  }
}
