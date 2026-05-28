export function buildEmailHTML(): string {
  return '%%[ENDIF]%%'
}

export function buildSuperContent(): string {
  return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-family:sans-serif;font-size:11px;color:#d4001c;"><div style="flex:1;height:1px;background:#d4001c;"></div><span style="white-space:nowrap;">END FILTER</span><div style="flex:1;height:1px;background:#d4001c;"></div></div>`
}
