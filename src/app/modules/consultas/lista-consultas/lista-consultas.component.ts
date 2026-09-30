import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { ConsultasService } from '../../../core/services/consultas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Consulta } from '../../../core/models';

@Component({
  selector: 'app-lista-consultas',
  templateUrl: './lista-consultas.component.html',
  styleUrls: ['./lista-consultas.component.scss']
})
export class ListaConsultasComponent implements OnInit {
  displayedColumns = ['fecha', 'mascota', 'cliente', 'veterinario', 'diagnostico', 'tipo', 'acciones'];
  dataSource = new MatTableDataSource<Consulta>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private consultasService: ConsultasService,
    private mascotasService: MascotasService,
    private clientesService: ClientesService,
    private usuariosService: UsuariosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.dataSource.data = this.consultasService.getAll().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(ev: Event): void { this.dataSource.filter = (ev.target as HTMLInputElement).value.trim().toLowerCase(); }
  getMascota(id: string): string { return this.mascotasService.getById(id)?.nombre || '-'; }
  getCliente(id: string): string { return this.clientesService.getById(id)?.nombre || '-'; }
  getVet(id: string): string { return this.usuariosService.getNombreCompleto(id); }
  iconoTipo(tipo: string): string { return tipo === 'inmediata' ? 'flash_on' : 'event'; }
  verDetalle(c: Consulta): void { this.router.navigate(['/mascotas', c.mascotaId]); }
  nueva(): void { this.router.navigate(['/consultas/nueva']); }
}
