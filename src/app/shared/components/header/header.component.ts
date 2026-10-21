import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../core/models';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatDivider } from '@angular/material/list';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    imports: [MatToolbar, MatIconButton, MatIcon, MatMenuTrigger, MatMenu, MatMenuItem, MatDivider]
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  @Output() menuToggle = new EventEmitter<void>();

  get user(): Usuario | null {
    return this.auth.currentUser;
  }

  get rolLabel(): string {
    const roles: any = { admin: 'Administrador', veterinario: 'Veterinario', recepcion: 'Recepción' };
    return this.user ? roles[this.user.rol] : '';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
