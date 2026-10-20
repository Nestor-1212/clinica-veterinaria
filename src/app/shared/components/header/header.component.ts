import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../core/models';

@Component({
  standalone: false,
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @Output() menuToggle = new EventEmitter<void>();

  get user(): Usuario | null {
    return this.auth.currentUser;
  }

  get rolLabel(): string {
    const roles: any = { admin: 'Administrador', veterinario: 'Veterinario', recepcion: 'Recepción' };
    return this.user ? roles[this.user.rol] : '';
  }

  constructor(private auth: AuthService, private router: Router) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
