import { promises as fs } from 'fs';
import path from 'path';
import * as xml2js from 'xml2js'; // we'll use a tiny custom parser instead

// Лёгкий парсер XML без зависимостей (fast-xml-parser уже может быть установлен, но сделаем свой для надёжности)
// Используем DOMParser в браузере, на сервере — простой regex-парсер с поддержкой вложенности.

export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

const DEMO_DIR = path.join(process.cwd(), 'public', 'demo-data', 'xml');

/** Very small, well-scoped XML parser sufficient for RK7 reports. */
export function parseXml(xml: string): XmlNode {
  // Strip BOM & declarations
  const cleaned = xml.replace(/^\uFEFF/, '').replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '');
  let i = 0;
  const root: XmlNode = { name: '#root', attrs: {}, children: [], text: '' };

  function parseElement(parent: XmlNode): XmlNode | null {
    // expect '<'
    while (i < cleaned.length && cleaned[i] !== '<') i++;
    if (i >= cleaned.length) return null;
    if (cleaned[i + 1] === '/') {
      // closing tag — caller handles
      return null;
    }
    // read tag name
    i++; // skip '<'
    const nameStart = i;
    while (i < cleaned.length && /[\w:-]/.test(cleaned[i])) i++;
    const name = cleaned.slice(nameStart, i);
    if (!name) return null;

    // parse attrs
    const attrs: Record<string, string> = {};
    while (i < cleaned.length && cleaned[i] !== '>' && cleaned[i] !== '/') {
      // skip whitespace
      while (i < cleaned.length && /\s/.test(cleaned[i])) i++;
      if (cleaned[i] === '>' || cleaned[i] === '/') break;
      const attrStart = i;
      while (i < cleaned.length && /[\w:-]/.test(cleaned[i])) i++;
      const attrName = cleaned.slice(attrStart, i);
      if (!attrName) break;
      while (i < cleaned.length && /\s/.test(cleaned[i])) i++;
      if (cleaned[i] === '=') {
        i++;
        while (i < cleaned.length && /\s/.test(cleaned[i])) i++;
        const quote = cleaned[i];
        if (quote === '"' || quote === "'") {
          i++;
          const valStart = i;
          while (i < cleaned.length && cleaned[i] !== quote) i++;
          attrs[attrName] = decodeEntities(cleaned.slice(valStart, i));
          i++; // skip closing quote
        }
      } else {
        attrs[attrName] = '';
      }
    }
    // self-closing?
    if (cleaned[i] === '/') {
      i++;
      // skip '>'
      while (i < cleaned.length && cleaned[i] !== '>') i++;
      i++;
      const node: XmlNode = { name, attrs, children: [], text: '' };
      parent.children.push(node);
      return node;
    }
    // skip '>'
    i++;
    // parse children & text until matching close tag
    const node: XmlNode = { name, attrs, children: [], text: '' };
    const textStart = i;
    let textBuffer = '';
    while (i < cleaned.length) {
      if (cleaned[i] === '<' && cleaned[i + 1] === '/') {
        // close tag
        const closeStart = i;
        i += 2;
        while (i < cleaned.length && cleaned[i] !== '>') i++;
        i++; // skip '>'
        // Only stop if this close matches our name; else, treat as part of text (defensive)
        const closeText = cleaned.slice(closeStart + 2, i - 1).trim();
        if (closeText === name) {
          node.text = textBuffer.trim();
          parent.children.push(node);
          return node;
        } else {
          textBuffer += cleaned.slice(closeStart, i);
        }
      } else if (cleaned[i] === '<') {
        // child element
        // flush any pending text
        if (textBuffer.trim()) {
          node.text = textBuffer.trim();
          textBuffer = '';
        }
        const child = parseElement(node);
        if (!child) break;
      } else {
        textBuffer += cleaned[i];
        i++;
      }
    }
    // Unused but keep lint quiet
    void textStart;
    node.text = textBuffer.trim();
    parent.children.push(node);
    return node;
  }

  // Iterate top-level elements
  while (i < cleaned.length) {
    if (cleaned[i] === '<') {
      const before = i;
      const el = parseElement(root);
      if (!el) {
        // didn't advance, force forward to prevent infinite loop
        if (i === before) i++;
      }
    } else {
      i++;
    }
  }

  return root;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export async function readDemoXml(fileName: string): Promise<string> {
  const filePath = path.join(DEMO_DIR, fileName);
  return fs.readFile(filePath, 'utf-8');
}

export async function parseDemoXml(fileName: string): Promise<XmlNode> {
  const xml = await readDemoXml(fileName);
  return parseXml(xml);
}

export function findChildren(node: XmlNode | undefined, name: string): XmlNode[] {
  if (!node) return [];
  return node.children.filter((c) => c.name === name);
}

export function findChild(node: XmlNode | undefined, name: string): XmlNode | undefined {
  if (!node) return undefined;
  return node.children.find((c) => c.name === name);
}

export function getText(node: XmlNode | undefined): string {
  return node?.text?.trim() ?? '';
}

export function num(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

export function int(s: string | undefined): number {
  if (!s) return 0;
  const n = parseInt(s.replace(/\s/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

/** Normalize indented name (RK7 often prefixes with spaces for hierarchy). */
export function cleanName(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
