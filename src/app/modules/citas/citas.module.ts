import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ListaCitasComponent } from './lista-citas/lista-citas.component';
import { FormCitaComponent } from './form-cita/form-cita.component';

const routes: Routes = [
  { path: '', component: ListaCitasComponent },
  { path: 'nueva', component: FormCitaComponent }
];

@NgModule({
  declarations: [ListaCitasComponent, FormCitaComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class CitasModule {}
