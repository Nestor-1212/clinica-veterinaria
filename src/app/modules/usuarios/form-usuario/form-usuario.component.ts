import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { RolUsuario, Usuario } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatInput, MatError } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatCheckbox } from '@angular/material/checkbox';

@Component({
    selector: 'app-form-usuario',
    templateUrl: './form-usuario.component.html',
    styleUrls: ['./form-usuario.component.scss'],
    imports: [MatIcon, MatButton, RouterLink, MatCard, MatCardContent, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatSelect, MatOption, MatCheckbox]
})
export class FormUsuarioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);

  form: FormGroup;
  isEdit = false;
  usuarioId = '';
  roles: { value: RolUsuario, label: string }[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'veterinario', label: 'Veterinario' },
    { value: 'recepcion', label: 'Recepción' }
  ];

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
        this.form.get('password')?.setValidators([Validators.minLength(6)]);
        this.form.get('password')?.updateValueAndValidity();
      }
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const data: Partial<Usuario> = { ...this.form.value };

    if (this.usuariosService.existeCorreo(data.correo ?? '', this.isEdit ? this.usuarioId : undefined)) {
      this.snack.open('Ya existe un usuario con ese correo', 'OK', { duration: 3000, panelClass: 'snack-error' });
      return;
    }

    if (this.isEdit) {
      // B4: si el campo queda vacío se conserva la contraseña existente.
      if (!data.password) delete data.password;
      const error = this.usuariosService.validarCambio(this.usuarioId, data, this.auth.currentUser?.id);
      if (error) {
        this.snack.open(error, 'OK', { duration: 3000, panelClass: 'snack-error' });
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
