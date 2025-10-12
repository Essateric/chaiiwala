// netlify/functions/_lib/annotations.js
export function addLinkAnnotation(pdfDoc, page, x, y, width, height, url) {
  try {
    const rect = [x, y, x + width, y + height];
    const link = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: rect,
      Border: [0, 0, 0],
      A: pdfDoc.context.obj({ Type: 'Action', S: 'URI', URI: pdfDoc.context.str(url) }),
    });
    const annots = page.node.Annots();
    if (annots) annots.push(link);
    else page.node.set(pdfDoc.context.lookupName('Annots'), pdfDoc.context.obj([link]));
  } catch {/* non-fatal */}
}
