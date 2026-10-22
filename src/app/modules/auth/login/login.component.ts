import { Component, ElementRef, inject } from '@angular/core';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { DEMO_MODE } from '../../../core/config/demo-mode.token';
import { ROL_LABELS } from '../../../core/auth/permisos';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatInput, MatSuffix, MatError, MatHint } from '@angular/material/input';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { HuellasComponent } from './huellas/huellas.component';
import { TransicionEntradaService, prefiereMenosMovimiento } from '../../../core/ui/transicion-entrada.service';

/** Tiempo que se muestra el check de éxito antes de pasar al sistema. */
const PAUSA_EXITO_MS = 420;

/** Solo se recuerda el correo, nunca la contraseña. */
export const CLAVE_CORREO_RECORDADO = 'vet_correo_recordado';

export interface CuentaDemo {
  rol: string;
  icono: string;
  correo: string;
  password: string;
}

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    imports: [MatIcon, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatSuffix, MatError, MatHint, MatIconButton, MatButton, MatCheckbox, MatProgressSpinner, HuellasComponent]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private transicion = inject(TransicionEntradaService);
  private host = inject(ElementRef, { optional: true });
  /** Las cuentas de demostración solo se muestran en modo demo. */
  readonly demo = inject(DEMO_MODE);

  readonly cuentasDemo: CuentaDemo[] = [
    { rol: ROL_LABELS.admin, icono: 'admin_panel_settings', correo: 'admin@clinica.com', password: 'admin123' },
    { rol: ROL_LABELS.veterinario, icono: 'medical_services', correo: 'vet@clinica.com', password: 'vet123' },
    { rol: ROL_LABELS.recepcion, icono: 'support_agent', correo: 'recepcion@clinica.com', password: 'rec123' }
  ];

  form: FormGroup;
  loading = false;
  hidePassword = true;
  bloqMayus = false;
  mostrarAyudaPassword = false;
  /** Credenciales correctas: el botón muestra el check mientras arranca la transición. */
  exito = false;

  constructor() {
    const recordado = this.leerCorreoRecordado();
    this.form = this.fb.group({
      correo: [recordado ?? '', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      recordar: [recordado !== null]
    });

    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  /** Detecta Bloq Mayús al escribir en la contraseña. */
  revisarBloqMayus(event: KeyboardEvent): void {
    if (typeof event.getModifierState === 'function') {
      this.bloqMayus = event.getModifierState('CapsLock');
    }
  }

  usarCuentaDemo(cuenta: CuentaDemo): void {
    this.form.patchValue({ correo: cuenta.correo, password: cuenta.password });
    // Con el formulario relleno, el siguiente paso natural es entrar
    queueMicrotask(() => this.host?.nativeElement?.querySelector('button[type="submit"]')?.focus());
  }

  onSubmit(): void {
    if (this.loading) return;
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.loading = true;
    const { correo, password, recordar } = this.form.value;
    const ok = this.auth.login(correo, password);
    if (ok) {
      this.guardarCorreoRecordado(recordar ? correo : null);
      // loading sigue en true hasta salir del login: evita un segundo envío
      this.exito = true;
      if (prefiereMenosMovimiento()) {
        this.router.navigate(['/dashboard']);
      } else {
        // La franja de marca se convierte en la barra superior del sistema (View Transition)
        this.transicion.marcar();
        setTimeout(() => this.router.navigate(['/dashboard']), PAUSA_EXITO_MS);
      }
    } else {
      this.loading = false;
      this.snack.open('El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo.', 'Cerrar', { duration: 6000, panelClass: 'snack-error' });
      // Se conserva lo escrito y queda seleccionado para reescribirlo de una vez
      queueMicrotask(() => {
        const input = this.host?.nativeElement?.querySelector('input[formControlName="password"]') as HTMLInputElement | null;
        input?.focus();
        input?.select();
      });
    }
  }

  private leerCorreoRecordado(): string | null {
    try {
      return localStorage.getItem(CLAVE_CORREO_RECORDADO);
    } catch {
      return null;
    }
  }

  private guardarCorreoRecordado(correo: string | null): void {
    try {
      if (correo) localStorage.setItem(CLAVE_CORREO_RECORDADO, correo);
      else localStorage.removeItem(CLAVE_CORREO_RECORDADO);
    } catch {
      // Sin almacenamiento disponible (modo privado): no se recuerda, sin error para el usuario
    }
  }
}
