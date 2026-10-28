import { Component, OnInit, inject, ElementRef } from '@angular/core';
import { validarYEnfocar } from '../../../shared/utils/formulario';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { RolUsuario, Usuario } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { PERMISOS, Seccion } from '../../../core/auth/permisos';
import { ICONO_ROL } from '../lista-usuarios/lista-usuarios.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatInput, MatError, MatHint, MatSuffix } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { ResumenErroresComponent } from '../../../shared/components/resumen-errores/resumen-errores.component';

@Component({
    selector: 'app-form-usuario',
    templateUrl: './form-usuario.component.html',
    styleUrls: ['./form-usuario.component.scss'],
    imports: [ResumenErroresComponent, MatIcon, MatButton, MatIconButton, RouterLink, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatHint, MatSuffix, MatSlideToggle]
})
export class FormUsuarioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);

  form: FormGroup;
  /** Evita el doble envío: true desde que se acepta el envío hasta navegar. */
  enviando = false;
  private host = inject(ElementRef, { optional: true });
  isEdit = false;
  usuarioId = '';
  roles: { value: RolUsuario, label: string, descripcion: string }[] = [
    { value: 'veterinario', label: 'Veterinario', descripcion: 'Atiende pacientes: consultas, recetas y laboratorio' },
    { value: 'recepcion', label: 'Recepción', descripcion: 'Agenda, clientes y cobros' },
    { value: 'admin', label: 'Administrador', descripcion: 'Todo, incluidos reportes y usuarios' }
  ];
  readonly ICONO_ROL = ICONO_ROL;
  verPassword = false;
  nombreOriginal = '';

  /** Secciones a las que da acceso el rol elegido (de la matriz de permisos, no una lista aparte). */
  get accesos(): string[] {
    const rol = this.form.get('rol')?.value as RolUsuario;
    return (Object.keys(PERMISOS) as Seccion[]).filter(s => PERMISOS[s].includes(rol)).map(s => NOMBRE_SECCION[s]);
  }

  get rolElegido() { return this.roles.find(r => r.value === this.form.get('rol')?.value); }
  get iconoRol(): string { return ICONO_ROL[this.form.get('rol')?.value as RolUsuario] ?? 'person'; }

  get iniciales(): string {
    const v = this.form.value;
    return `${(v.nombre || '').trim().charAt(0)}${(v.apellido || '').trim().charAt(0)}`.toUpperCase();
  }

  constructor() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required]],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rol: ['recepcion', Validators.required],
      telefono: [''],
      especialidad: [''],
      activo: [true]
    });
  }

  ngOnInit(): void {
    this.usuarioId = this.route.snapshot.params.id;
    if (this.usuarioId) {
      this.isEdit = true;
      const u = this.usuariosService.getById(this.usuarioId);
      if (u) {
        // B4: la contraseña actual nunca se carga en el formulario; en edición es opcional.
        this.form.patchValue({ ...u, password: '' });
        this.nombreOriginal = `${u.nombre} ${u.apellido}`;
        this.form.get('password')?.setValidators([Validators.minLength(6)]);
        this.form.get('password')?.updateValueAndValidity();
      }
    }
  }

  onSubmit(): void {
    if (this.enviando) return;
    if (!validarYEnfocar(this.form, this.host?.nativeElement)) return;
    this.enviando = true;
    const data: Partial<Usuario> = { ...this.form.value };
    // La especialidad solo aplica a veterinarios (el campo se oculta para otros roles)
    if (data.rol !== 'veterinario') data.especialidad = '';

    if (this.usuariosService.existeCorreo(data.correo ?? '', this.isEdit ? this.usuarioId : undefined)) {
      this.snack.open('Ya existe un usuario con ese correo', 'OK', { duration: 3000, panelClass: 'snack-error' });
      this.enviando = false;
      return;
    }

    if (this.isEdit) {
      // B4: si el campo queda vacío se conserva la contraseña existente.
      if (!data.password) delete data.password;
      const error = this.usuariosService.validarCambio(this.usuarioId, data, this.auth.currentUser?.id);
      if (error) {
        this.snack.open(error, 'OK', { duration: 3000, panelClass: 'snack-error' });
        this.enviando = false;
        return;
      }
    }

    if (this.isEdit) {
      this.usuariosService.update(this.usuarioId, data);
      this.snack.open('Usuario actualizado', 'OK', { duration: 2000 });
    } else {
      this.usuariosService.create(data as Omit<Usuario, 'id' | 'createdAt'>);
      this.snack.open('Usuario creado', 'OK', { duration: 2000 });
    }
    this.router.navigate(['/usuarios']);
  }
}

const NOMBRE_SECCION: Record<Seccion, string> = {
  dashboard: 'Inicio', clientes: 'Clientes', mascotas: 'Mascotas', citas: 'Citas', consultas: 'Consultas', recetas: 'Recetas',
  vacunas: 'Vacunas', examenes: 'Laboratorio', pagos: 'Pagos', reportes: 'Reportes', usuarios: 'Usuarios'
};
