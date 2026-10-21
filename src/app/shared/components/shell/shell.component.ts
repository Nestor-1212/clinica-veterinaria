import { Component, ElementRef, ViewChild, OnInit, inject } from '@angular/core';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-shell',
    templateUrl: './shell.component.html',
    styleUrls: ['./shell.component.scss'],
    imports: [HeaderComponent, MatSidenavContainer, MatSidenav, SidebarComponent, MatSidenavContent, RouterOutlet]
})
export class ShellComponent implements OnInit {
  private bp = inject(BreakpointObserver);

  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('contenido') contenido!: ElementRef<HTMLElement>;
  isMobile = false;

  ngOnInit(): void {
    this.bp.observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .subscribe(result => {
        this.isMobile = result.matches;
      });
  }

  toggleSidenav(): void {
    this.sidenav.toggle();
  }

  /**
   * Enlace "Saltar al contenido": mueve el foco al <main> sin cambiar la URL
   * (con <base href="/"> un href="#contenido" navegaría a la raíz).
   */
  irAlContenido(event: Event): void {
    event.preventDefault();
    this.contenido.nativeElement.focus();
  }
}
