import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { PagosService } from '../../../core/services/pagos.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { PdfService } from '../../../core/services/pdf.service';
import { Pago } from '../../../core/models';

@Component({
  selector: 'app-lista-pagos',
  templateUrl: './lista-pagos.component.html',
  styleUrls: ['./lista-pagos.component.scss']
})
export class ListaPagosComponent implements OnInit {
  displayedColumns = ['fecha', 'cliente', 'mascota', 'metodo', 'total', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Pago>();
  totalMes = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private pagosService: PagosService,
    private clientesService: ClientesService,
    private mascotasService: MascotasService,
    private pdfService: PdfService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.dataSource.data = this.pagosService.getAll().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    this.totalMes = this.pagosService.getTotalMes();
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }
  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  getCliente(id: string): string { return this.clientesService.getById(id)?.nombre || '-'; }
  getMascota(id: string): string { return this.mascotasService.getById(id)?.nombre || '-'; }

  async imprimirFactura(pago: Pago): Promise<void> {
    const cliente = this.clientesService.getById(pago.clienteId);
    const mascota = this.mascotasService.getById(pago.mascotaId);
    if (cliente && mascota) await this.pdfService.generarFactura(pago, cliente, mascota);
  }
}
