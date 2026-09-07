export function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.cls)
        node.className = opts.cls;
    if (opts.text !== undefined)
        node.textContent = opts.text;
    if (opts.attrs)
        for (const [k, v] of Object.entries(opts.attrs))
            node.setAttribute(k, v);
    if (opts.onClick)
        node.addEventListener("click", opts.onClick);
    for (const c of children)
        node.append(c);
    return node;
}
export function clear(node) {
    node.innerHTML = "";
}
export function barWidth(cur, max) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
    return `${pct}%`;
}
