import { Component, ElementRef, inject } from '@angular/core';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { DEMO_MODE } from '../../../core/config/demo-mode.token';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatInput, MatSuffix, MatError } from '@angular/material/input';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    imports: [MatCard, MatIcon, MatCardContent, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatSuffix, MatError, MatIconButton, MatButton, MatProgressSpinner]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  /** Los botones de acceso rápido solo se muestran en modo demo. */
  readonly demo = inject(DEMO_MODE);

  form: FormGroup;
  loading = false;
  hidePassword = true;
  private host = inject(ElementRef, { optional: true });

  constructor() {
    this.form = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  fillCredentials(correo: string, password: string): void {
    this.form.setValue({ correo, password });
  }

  onSubmit(): void {
    if (this.loading) return;
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.loading = true;
    const { correo, password } = this.form.value;
    const ok = this.auth.login(correo, password);
    if (ok) {
      // loading sigue en true hasta salir del login: evita un segundo envío
      this.router.navigate(['/dashboard']);
    } else {
      this.loading = false;
      this.snack.open('Credenciales incorrectas', 'Cerrar', { duration: 3000, panelClass: 'snack-error' });
    }
  }
}
