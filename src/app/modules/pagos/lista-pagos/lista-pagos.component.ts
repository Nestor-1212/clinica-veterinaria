import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { Router, RouterLink } from '@angular/router';
import { PagosService } from '../../../core/services/pagos.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { PdfService } from '../../../core/services/pdf.service';
import { Pago } from '../../../core/models';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatChip } from '@angular/material/chips';
import { DecimalPipe, TitleCasePipe, DatePipe } from '@angular/common';

@Component({
    selector: 'app-lista-pagos',
    templateUrl: './lista-pagos.component.html',
    styleUrls: ['./lista-pagos.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatIconButton, MatSuffix, MatTooltip, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatChip, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, DecimalPipe, TitleCasePipe, DatePipe]
})
export class ListaPagosComponent implements OnInit, AfterViewInit {
  private pagosService = inject(PagosService);
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private pdfService = inject(PdfService);
  private router = inject(Router);

  displayedColumns = ['fecha', 'cliente', 'mascota', 'metodo', 'total', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Pago>();
  totalMes = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.data = this.pagosService.getAll().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    this.totalMes = this.pagosService.getTotalMes();
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }
  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  getCliente(id: string): string { return this.clientesService.getById(id)?.nombre || '-'; }
  getMascota(id: string): string { return this.mascotasService.getById(id)?.nombre || '-'; }

  iconoEstado(estado: string): string {
    const iconos: Record<string, string> = { pagado: 'check_circle', pendiente: 'schedule', anulado: 'cancel' };
    return iconos[estado] || 'payments';
  }

  async imprimirFactura(pago: Pago): Promise<void> {
    const cliente = this.clientesService.getById(pago.clienteId);
    const mascota = this.mascotasService.getById(pago.mascotaId);
    if (cliente && mascota) await this.pdfService.generarFactura(pago, cliente, mascota);
  }
}
