import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {
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
    if (this.form.invalid) return;
    this.loading = true;
    const { correo, password } = this.form.value;
    const ok = this.auth.login(correo, password);
    this.loading = false;
    if (ok) {
      this.router.navigate(['/dashboard']);
    } else {
      this.snack.open('Credenciales incorrectas', 'Cerrar', { duration: 3000, panelClass: 'snack-error' });
    }
  }
}
