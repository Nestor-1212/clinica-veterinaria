import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ListaExamenesComponent } from './lista-examenes/lista-examenes.component';
import { FormExamenComponent } from './form-examen/form-examen.component';

const routes: Routes = [
  { path: '', component: ListaExamenesComponent },
  { path: 'nuevo', component: FormExamenComponent },
  { path: 'editar/:id', component: FormExamenComponent }
];

@NgModule({
  declarations: [ListaExamenesComponent, FormExamenComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ExamenesModule {}
