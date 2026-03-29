import { inject, Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { SupabaseService } from './supabase.service';
import { MaintenanceTask } from './maintenance-tasks.service';
import { Maintenance } from './maintenance.service';
import { Machine } from './machines.service';
import { TaskImage } from './task-images.service';
import {
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_STATUS_LABELS,
  TASK_STATUS_LABELS,
  TaskStatus,
} from '../constants/domain.const';

// ── Color tokens ────────────────────────────────────────────────────────────

const STATUS_BG: Record<TaskStatus, [number, number, number]> = {
  pending:     [254, 249, 195],
  in_progress: [219, 234, 254],
  completed:   [220, 252, 231],
  skipped:     [243, 244, 246],
};

const STATUS_ACCENT: Record<TaskStatus, [number, number, number]> = {
  pending:     [234, 179,   8],
  in_progress: [ 37,  99, 235],
  completed:   [ 22, 163,  74],
  skipped:     [156, 163, 175],
};

const STATUS_TEXT: Record<TaskStatus, [number, number, number]> = {
  pending:     [146, 109,   0],
  in_progress: [ 29,  78, 216],
  completed:   [ 20, 119,  60],
  skipped:     [ 75,  85,  99],
};

// ── Image helpers ────────────────────────────────────────────────────────────

interface ImageData {
  dataUrl: string;
  format:  string;
  natW:    number;
  natH:    number;
}

async function fetchImageData(url: string): Promise<ImageData | null> {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const format: string =
      blob.type === 'image/png'  ? 'PNG'  :
      blob.type === 'image/webp' ? 'WEBP' : 'JPEG';

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('read'));
      reader.readAsDataURL(blob);
    });

    const { natW, natH } = await new Promise<{ natW: number; natH: number }>((resolve, reject) => {
      const img    = new window.Image();
      img.onload  = () => resolve({ natW: img.naturalWidth, natH: img.naturalHeight });
      img.onerror = () => reject(new Error('load'));
      img.src      = dataUrl;
    });

    return { dataUrl, format, natW, natH };
  } catch {
    return null;
  }
}

/** Calculates contained dimensions and centering offsets within a bounding box. */
function containFit(
  natW: number, natH: number,
  boxW: number, boxH: number,
): { w: number; h: number; dx: number; dy: number } {
  const scale = Math.min(boxW / natW, boxH / natH);
  const w = natW * scale;
  const h = natH * scale;
  return { w, h, dx: (boxW - w) / 2, dy: (boxH - h) / 2 };
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class TasksReportService {
  private readonly supabaseService = inject(SupabaseService);

  async generatePdf(
    tasks: MaintenanceTask[],
    maintenance: Maintenance,
    machine: Machine | null,
  ): Promise<void> {
    // ── 1. Load all images in one query ────────────────────────────────────
    const taskIds = tasks.map(t => t.id);
    let allImages: TaskImage[] = [];
    if (taskIds.length > 0) {
      const { data } = await this.supabaseService.supabase
        .from('task_images')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });
      allImages = (data as TaskImage[]) ?? [];
    }

    const imagesByTask = new Map<number, TaskImage[]>();
    for (const img of allImages) {
      if (!imagesByTask.has(img.task_id)) imagesByTask.set(img.task_id, []);
      imagesByTask.get(img.task_id)!.push(img);
    }

    // ── 2. Fetch image data (base64 + natural size) in parallel ────────────
    const imageDataMap = new Map<number, ImageData | null>();
    await Promise.all(
      allImages.map(async img => {
        imageDataMap.set(img.id, await fetchImageData(img.url));
      }),
    );

    // ── 3. Setup ────────────────────────────────────────────────────────────
    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    const margin = 14;
    const cw     = pageW - margin * 2;

    const typeLabel   = MAINTENANCE_TYPE_LABELS[maintenance.type];
    const statusLabel = MAINTENANCE_STATUS_LABELS[maintenance.status];
    const machineName = machine?.name ?? '—';
    const machineCode = machine?.code ?? '';
    const scheduledAt = new Date(maintenance.scheduled_at).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const nowStr = new Date().toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    // ── Counts per status ───────────────────────────────────────────────────
    const counts: Record<TaskStatus, number> = {
      pending: 0, in_progress: 0, completed: 0, skipped: 0,
    };
    for (const t of tasks) counts[t.status]++;

    // ── Helpers ─────────────────────────────────────────────────────────────

    const drawPageHeader = () => {
      // Dark band
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 26, 'F');
      // Blue accent line at the bottom of the band
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 25.5, pageW, 0.8, 'F');

      // Logo square
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(margin, 5, 16, 16, 2.5, 2.5, 'F');
      // Wrench-like icon strokes
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1.5);
      doc.lines([[4, 4], [4.5, -6]], margin + 3.5, 13.5, [1, 1], undefined, false);

      // Brand text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('REVISOR.IO', margin + 20, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Gestión industrial simplificada', margin + 20, 18);

      // Report title (right-aligned)
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Reporte de Tareas de Mantenimiento', pageW - margin, 12, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generado: ${nowStr}`, pageW - margin, 18, { align: 'right' });
    };

    const drawPageFooter = (pageNum: number, total: number) => {
      // Footer line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, pageH - 9, pageW - margin, pageH - 9);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Revisor.io — Documento confidencial', margin, pageH - 5.5);
      doc.text(`Página ${pageNum} de ${total}`, pageW - margin, pageH - 5.5, { align: 'right' });
    };

    // ── Draw first page ─────────────────────────────────────────────────────
    drawPageHeader();
    let y = 32;

    // ── Maintenance info block ──────────────────────────────────────────────
    const infoH = maintenance.description || maintenance.notes ? 30 : 24;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, cw, infoH, 2, 2, 'FD');

    // Left blue accent bar
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(margin, y, 3, infoH, 1, 1, 'F');
    // Re-draw right side of accent bar straight
    doc.rect(margin + 1.5, y, 1.5, infoH, 'F');

    // Machine code badge
    const codeText = machineCode;
    if (codeText) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      const codeTw = doc.getTextWidth(codeText);
      const badgeW = codeTw + 6;
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(margin + 7, y + 4, badgeW, 5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(codeText, margin + 7 + badgeW / 2, y + 7.8, { align: 'center' });
    }

    // Machine name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const nameX = machineCode ? margin + 7 + doc.getTextWidth(machineCode) + 12 : margin + 7;
    doc.text(machineName, nameX, y + 8);

    // Meta row
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `${typeLabel}  ·  ${scheduledAt}  ·  ${tasks.length} tarea${tasks.length !== 1 ? 's' : ''}`,
      margin + 7,
      y + 15,
    );

    if (maintenance.description) {
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const lines = doc.splitTextToSize(maintenance.description, cw - 12) as string[];
      doc.text(lines[0], margin + 7, y + 21);
    }

    // Status pill (top-right of block)
    {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      const stw  = doc.getTextWidth(statusLabel);
      const spw  = stw + 8;
      const sph  = 5.5;
      const spx  = pageW - margin - spw - 4;
      const spy  = y + 4;
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(134, 239, 172);
      doc.setLineWidth(0.3);
      doc.roundedRect(spx, spy, spw, sph, 1.5, 1.5, 'FD');
      doc.setTextColor(22, 101, 52);
      doc.text(statusLabel, spx + spw / 2, spy + 3.8, { align: 'center' });
    }

    y += infoH + 5;

    // ── KPI boxes ────────────────────────────────────────────────────────────
    const kpis: { status: TaskStatus; label: string }[] = [
      { status: 'pending',     label: 'Pendiente'   },
      { status: 'in_progress', label: 'En progreso' },
      { status: 'completed',   label: 'Completado'  },
      { status: 'skipped',     label: 'Omitida'     },
    ];
    const kpiGap = 3;
    const kpiW   = (cw - kpiGap * 3) / 4;
    const kpiH   = 20;

    for (let i = 0; i < kpis.length; i++) {
      const kpi  = kpis[i];
      const bx   = margin + i * (kpiW + kpiGap);
      const by   = y;
      const [ar, ag, ab] = STATUS_ACCENT[kpi.status];

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(bx, by, kpiW, kpiH, 2, 2, 'FD');

      // Colored top bar
      doc.setFillColor(ar, ag, ab);
      doc.roundedRect(bx, by, kpiW, 3, 1, 1, 'F');
      doc.rect(bx, by + 1.5, kpiW, 1.5, 'F'); // flatten bottom of top bar

      // Count
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(String(counts[kpi.status]), bx + kpiW / 2, by + 12.5, { align: 'center' });

      // Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(kpi.label, bx + kpiW / 2, by + 18, { align: 'center' });
    }

    y += kpiH + 8;

    // ── Section header ───────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(37, 99, 235);
    doc.text('DETALLE DE TAREAS', margin, y);

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.4);
    const labelW = doc.getTextWidth('DETALLE DE TAREAS');
    doc.line(margin + labelW + 3, y - 1, pageW - margin, y - 1);

    y += 6;

    // ── Task cards ────────────────────────────────────────────────────────────
    const IMG_CELL_W = (cw - 13) / 2;
    const IMG_CELL_H = 45;

    for (const task of tasks) {
      const taskImages = imagesByTask.get(task.id) ?? [];
      const loaded = taskImages
        .map(img => ({ img, data: imageDataMap.get(img.id) ?? null }))
        .filter((x): x is { img: TaskImage; data: ImageData } => x.data !== null);

      const cardH = this.estimateCardHeight(doc, task, loaded.length, cw, IMG_CELL_H);

      if (y + cardH > pageH - 12) {
        doc.addPage();
        drawPageHeader();
        y = 32;
      }

      // Card border + white background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, cw, cardH, 2, 2, 'FD');

      // Left accent bar
      const [ar, ag, ab] = STATUS_ACCENT[task.status];
      doc.setFillColor(ar, ag, ab);
      doc.roundedRect(margin, y, 3.5, cardH, 1.5, 1.5, 'F');
      doc.rect(margin + 2, y, 1.5, cardH, 'F');

      let cy = y + 5;
      const cx = margin + 8; // content x start

      // Task number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(`Tarea #${task.order_index + 1}`, cx, cy);

      // Status pill (right-aligned)
      {
        const label = TASK_STATUS_LABELS[task.status];
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        const tw  = doc.getTextWidth(label);
        const pw  = tw + 8;
        const ph  = 5;
        const px  = pageW - margin - pw - 4;
        const py  = cy - 3.5;
        const [br, bg, bb] = STATUS_BG[task.status];
        const [tr, tg, tb] = STATUS_TEXT[task.status];
        doc.setFillColor(br, bg, bb);
        doc.setDrawColor(ar, ag, ab);
        doc.setLineWidth(0.25);
        doc.roundedRect(px, py, pw, ph, 1.5, 1.5, 'FD');
        doc.setTextColor(tr, tg, tb);
        doc.text(label, px + pw / 2, cy + 0.2, { align: 'center' });
      }

      cy += 5;

      // Task title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const titleLines = doc.splitTextToSize(task.title, cw - 20) as string[];
      doc.text(titleLines, cx, cy);
      cy += titleLines.length * 5 + 2;

      // Divider below title
      doc.setDrawColor(240, 242, 245);
      doc.setLineWidth(0.25);
      doc.line(cx, cy, pageW - margin - 4, cy);
      cy += 4;

      // Description
      if (task.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(task.description, cw - 14) as string[];
        doc.text(lines, cx, cy);
        cy += lines.length * 4.2 + 3;
      }

      // Notes
      if (task.notes) {
        // Notes chip background
        const notesLines = doc.splitTextToSize(task.notes, cw - 22) as string[];
        const noteH = notesLines.length * 4 + 6;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.roundedRect(cx, cy - 2, cw - 14, noteH, 1.5, 1.5, 'FD');

        // Info dot
        doc.setFillColor(37, 99, 235);
        doc.circle(cx + 3, cy + 1, 1.2, 'F');

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(notesLines, cx + 8, cy + 1.5);
        cy += noteH + 3;
      }

      // Evidence section (images)
      if (loaded.length > 0) {
        // Section label
        doc.setDrawColor(240, 242, 245);
        doc.setLineWidth(0.25);
        doc.line(cx, cy, pageW - margin - 4, cy);
        cy += 4;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        doc.text(`EVIDENCIA FOTOGRÁFICA (${loaded.length})`, cx, cy);
        cy += 5;

        let col     = 0;
        let rowTopY = cy;

        for (const { data } of loaded) {
          const cellX = cx + col * (IMG_CELL_W + 3);

          // Cell background
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.roundedRect(cellX, rowTopY, IMG_CELL_W, IMG_CELL_H, 1.5, 1.5, 'FD');

          // Image with contain fit
          try {
            const { w, h, dx, dy } = containFit(data.natW, data.natH, IMG_CELL_W, IMG_CELL_H);
            doc.addImage(
              data.dataUrl,
              data.format,
              cellX + dx,
              rowTopY + dy,
              w,
              h,
              undefined,
              'FAST',
            );
          } catch { /* skip unrenderable image */ }

          col++;
          if (col >= 2) {
            col      = 0;
            rowTopY += IMG_CELL_H + 3;
          }
        }
      }

      y += cardH + 4;
    }

    // ── Footers ───────────────────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawPageFooter(p, totalPages);
    }

    const filename = `reporte_tareas_${maintenance.id}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }

  private estimateCardHeight(
    doc: jsPDF,
    task: MaintenanceTask,
    imageCount: number,
    cw: number,
    imgCellH: number,
  ): number {
    // Base: top padding (5) + task number row (5) + title section (5+2) + divider (5)
    let h = 22;

    // Title lines
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const titleLines = doc.splitTextToSize(task.title, cw - 20) as string[];
    h += (titleLines.length - 1) * 5; // extra lines beyond first

    if (task.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(task.description, cw - 14) as string[];
      h += lines.length * 4.2 + 3;
    }

    if (task.notes) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      const lines = doc.splitTextToSize(task.notes, cw - 22) as string[];
      h += lines.length * 4 + 6 + 3; // chip height + gap
    }

    if (imageCount > 0) {
      h += 4 + 5; // divider + label
      h += Math.ceil(imageCount / 2) * (imgCellH + 3);
    }

    // Bottom padding
    h += 5;

    return h;
  }
}
