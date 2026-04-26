import jsPDF from "jspdf";

/**
 * Generates a printable PDF flyer with optional event image and the AI-generated
 * flyer copy. Triggers a browser download.
 */
export async function downloadFlyerPdf(opts: {
  orgName: string;
  program: string;
  schedule: string;
  flyerCopy: string;
  imageUrl?: string | null;
  qrDataUrl?: string | null;
  qrCaption?: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  // Header band
  doc.setFillColor(0, 75, 135); // BGCKC navy
  doc.rect(0, 0, pageWidth, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(opts.orgName || "Boys & Girls Club", margin, 50);

  let cursorY = 110;
  doc.setTextColor(20, 20, 20);

  // Title (program)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  const titleLines = doc.splitTextToSize(opts.program || "Join us!", contentWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += titleLines.length * 32 + 6;

  // Schedule
  if (opts.schedule) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(0, 129, 198); // BGCKC blue
    doc.text(opts.schedule, margin, cursorY);
    cursorY += 24;
  }

  // Image
  if (opts.imageUrl) {
    try {
      const dataUrl = await urlToDataUrl(opts.imageUrl);
      const fmt = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
      const imgW = contentWidth;
      const imgH = 240;
      doc.addImage(dataUrl, fmt, margin, cursorY, imgW, imgH, undefined, "FAST");
      cursorY += imgH + 18;
    } catch {
      // skip image if it fails
    }
  }

  // Flyer body copy
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const bodyLines = doc.splitTextToSize(opts.flyerCopy || "", contentWidth);

  for (const line of bodyLines) {
    if (cursorY > pageHeight - margin - 100) {
      doc.addPage();
      cursorY = margin;
    }
    doc.text(line, margin, cursorY);
    cursorY += 16;
  }

  // QR code at bottom (if provided)
  if (opts.qrDataUrl) {
    const qrSize = 110;
    const qrX = pageWidth - margin - qrSize;
    const qrY = pageHeight - margin - qrSize;
    if (cursorY > qrY - 20) {
      doc.addPage();
    }
    doc.addImage(opts.qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Scan to sign up", qrX - 10, qrY + 30, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const cap = opts.qrCaption || "Quick sign-up — takes 30 seconds";
    const capLines = doc.splitTextToSize(cap, 180);
    doc.text(capLines, qrX - 10, qrY + 48, { align: "right" });
  }

  const safeName = (opts.program || "flyer").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  doc.save(`${safeName || "flyer"}.pdf`);
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: "cors" });
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
