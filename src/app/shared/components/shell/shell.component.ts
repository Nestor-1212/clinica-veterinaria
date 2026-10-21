import { Component, ViewChild, OnInit, inject } from '@angular/core';
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
}
