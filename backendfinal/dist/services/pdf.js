import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FONT_REGULAR = path.join(backendRoot, "assets/fonts/ReportSans.ttf");
const FONT_BOLD = path.join(backendRoot, "assets/fonts/ReportSans-Bold.ttf");
export function createPdfDocument(res) {
    const doc = new PDFDocument({ margin: 40 });
    doc.registerFont("Report", FONT_REGULAR);
    doc.registerFont("Report-Bold", FONT_BOLD);
    doc.pipe(res);
    return doc;
}
export function pdfTitle(doc, text) {
    doc.font("Report-Bold").fontSize(18).text(text, { underline: true });
    doc.font("Report");
}
export function pdfBody(doc, size = 11) {
    return doc.font("Report").fontSize(size);
}
