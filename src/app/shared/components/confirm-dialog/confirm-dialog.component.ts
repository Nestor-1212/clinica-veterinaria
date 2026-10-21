import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatInput } from '@angular/material/input';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  color?: 'warn' | 'primary';
  /**
   * Si se indica, el diálogo pide un texto (p. ej. el motivo de una anulación).
   * Al confirmar, afterClosed() devuelve ese texto en lugar de `true`.
   */
  input?: { label: string; required?: boolean };
}

@Component({
    selector: 'app-confirm-dialog',
    template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      @if (data.input) {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ data.input.label }}</mat-label>
          <textarea matInput rows="2" [(ngModel)]="texto" [required]="!!data.input.required"></textarea>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ data.cancelText || 'Cancelar' }}</button>
      <button mat-raised-button [color]="data.color || 'warn'" [disabled]="!puedeConfirmar" (click)="confirmar()">
        {{ data.confirmText || 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, MatDialogActions, MatButton, MatDialogClose, FormsModule, MatFormField, MatLabel, MatInput]
})
export class ConfirmDialogComponent {
  dialogRef = inject<MatDialogRef<ConfirmDialogComponent>>(MatDialogRef);
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  texto = '';

  get puedeConfirmar(): boolean {
    return !this.data.input?.required || this.texto.trim().length > 0;
  }

  confirmar(): void {
    if (!this.puedeConfirmar) return;
    this.dialogRef.close(this.data.input ? this.texto.trim() : true);
  }
}
