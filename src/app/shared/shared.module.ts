import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MaterialModule } from './material.module';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ShellComponent } from './components/shell/shell.component';

@NgModule({
  declarations: [ConfirmDialogComponent, HeaderComponent, SidebarComponent, ShellComponent],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, FormsModule, RouterModule],
  exports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MaterialModule, ConfirmDialogComponent, HeaderComponent, SidebarComponent, ShellComponent
  ],
})
export class SharedModule {}
