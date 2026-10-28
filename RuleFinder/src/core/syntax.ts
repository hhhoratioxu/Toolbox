/** Split only at grammar-level commas; preserve quoted strings and nested logic. */
export function tokenize(raw: string): { fields: string[]; error?: string } {
  const fields: string[] = []; let part = '', quote = '', depth = 0, escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (escaped) { part += c; escaped = false; continue; }
    if (c === '\\') { part += c; escaped = true; continue; }
    if (quote) { part += c; if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; part += c; continue; }
    // Inline comments only after whitespace; URL fragments and regex # stay intact.
    if ((c === '#' || (c === '/' && raw[i + 1] === '/')) && (i === 0 || /\s/.test(raw[i - 1])) && depth === 0) break;
    if (c === '(') depth++;
    if (c === ')') { depth--; if (depth < 0) return { fields: [], error: '逻辑表达式括号不配对' }; }
    if (c === ',' && depth === 0) { fields.push(unquote(part.trim())); part = ''; } else part += c;
  }
  if (quote || depth) return { fields: [], error: quote ? '引号未闭合' : '逻辑表达式括号未闭合' };
  fields.push(unquote(part.trim())); return { fields };
}
export function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1).replace(/\\(["'\\])/g, '$1');
  return value;
}
export function stableHash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
