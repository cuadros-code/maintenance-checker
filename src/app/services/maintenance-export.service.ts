import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Maintenance } from './maintenance.service';
import { Machine } from './machines.service';
import { UserWithRole } from './users.service';
import { MAINTENANCE_TYPE_LABELS, MAINTENANCE_STATUS_LABELS } from '../constants/domain.const';

export interface MaintenanceExportData {
  maintenances: Maintenance[];
  machineMap: Map<number, Machine>;
  userMap: Map<string, UserWithRole>;
  filterSummary: string;
}

const TYPE_LABELS = MAINTENANCE_TYPE_LABELS;
const STATUS_LABELS = MAINTENANCE_STATUS_LABELS;

const STATUS_COLORS: Record<string, [number, number, number]> = {
  'Completado':  [220, 252, 231],
  'Pendiente':   [243, 244, 246],
  'En progreso': [254, 249, 195],
  'Cancelado':   [241, 245, 249],
};

const TYPE_COLORS: Record<string, [number, number, number]> = {
  'Preventivo': [219, 234, 254],
  'Correctivo': [254, 226, 226],
  'Predictivo': [243, 232, 255],
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getFilename(ext: 'csv' | 'pdf'): string {
  return `mantenimientos_${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function buildRows(data: MaintenanceExportData): string[][] {
  return data.maintenances.map(m => {
    const machine = data.machineMap.get(m.machine_id);
    const user    = m.assigned_user_id ? data.userMap.get(m.assigned_user_id) : null;
    return [
      machine?.name ?? '—',
      machine?.code ?? '—',
      TYPE_LABELS[m.type],
      STATUS_LABELS[m.status],
      formatDate(m.scheduled_at),
      user?.email ?? 'Sin asignar',
      String(m.task_count),
      m.description ?? '',
      m.notes ?? '',
    ];
  });
}

@Injectable({ providedIn: 'root' })
export class MaintenanceExportService {

  exportCsv(data: MaintenanceExportData): void {
    const headers = [
      'Equipo', 'Código', 'Tipo', 'Estado',
      'Fecha programada', 'Asignado a', 'Tareas',
      'Descripción', 'Notas',
    ];

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escape).join(','),
      ...buildRows(data).map(r => r.map(escape).join(',')),
    ];

    const bom = '\uFEFF'; // UTF-8 BOM para compatibilidad con Excel
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFilename('csv');
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(data: MaintenanceExportData): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const now = new Date().toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    /* ── Header bar ── */
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 24, 'F');

    // Logo
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(14, 5, 14, 14, 2, 2, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1.5);
    doc.lines([[3.5, 3.5], [4, -5]], 17, 12.5, [1, 1], undefined, false);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('REVISOR.IO', 31, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Gestión industrial simplificada', 31, 17);

    // Title (right)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Reporte de Mantenimientos', pageW - 14, 11, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generado: ${now}`, pageW - 14, 17, { align: 'right' });

    /* ── Meta row ── */
    let y = 32;

    if (data.filterSummary) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Filtros: ${data.filterSummary}`, 14, y);
      y += 5;
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    const total = data.maintenances.length;
    doc.text(`${total} ${total === 1 ? 'registro' : 'registros'}`, 14, y);
    y += 5;

    /* ── Table ── */
    const headers = ['Equipo', 'Código', 'Tipo', 'Estado', 'Fecha programada', 'Asignado a', 'Tareas'];
    const rows = data.maintenances.map(m => {
      const machine = data.machineMap.get(m.machine_id);
      const user    = m.assigned_user_id ? data.userMap.get(m.assigned_user_id) : null;
      return [
        machine?.name ?? '—',
        machine?.code ?? '—',
        TYPE_LABELS[m.type],
        STATUS_LABELS[m.status],
        formatDate(m.scheduled_at),
        user?.email ?? 'Sin asignar',
        String(m.task_count),
      ];
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: y,
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 8,
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
        font: 'helvetica',
        lineColor: [226, 232, 240],
        lineWidth: 0.25,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [248, 250, 252],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 18 },
        2: { cellWidth: 24 },
        3: { cellWidth: 26 },
        4: { cellWidth: 36 },
        5: { cellWidth: 'auto' },
        6: { cellWidth: 14, halign: 'center' },
      },
      willDrawCell: (hookData) => {
        if (hookData.section !== 'body') return;
        const val = String(hookData.cell.text);
        if (hookData.column.index === 2 && TYPE_COLORS[val]) {
          doc.setFillColor(...TYPE_COLORS[val]);
        }
        if (hookData.column.index === 3 && STATUS_COLORS[val]) {
          doc.setFillColor(...STATUS_COLORS[val]);
        }
      },
      didDrawPage: (hookData) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Página ${hookData.pageNumber} de ${pageCount}  ·  Revisor.io`,
          pageW / 2,
          pageH - 5,
          { align: 'center' },
        );
      },
    });

    doc.save(getFilename('pdf'));
  }
}
