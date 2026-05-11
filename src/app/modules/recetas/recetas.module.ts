import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { FormRecetaComponent } from './form-receta/form-receta.component';
import { VerRecetaComponent } from './ver-receta/ver-receta.component';

const routes: Routes = [
  { path: 'nueva', component: FormRecetaComponent },
  { path: 'editar/:id', component: FormRecetaComponent },
  { path: ':id', component: VerRecetaComponent }
];

@NgModule({
  declarations: [FormRecetaComponent, VerRecetaComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class RecetasModule {}
