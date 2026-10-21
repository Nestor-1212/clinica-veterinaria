import { Routes } from '@angular/router';
import { ListaRecetasComponent } from './lista-recetas/lista-recetas.component';
import { FormRecetaComponent } from './form-receta/form-receta.component';
import { VerRecetaComponent } from './ver-receta/ver-receta.component';

const routes: Routes = [
  { path: '', component: ListaRecetasComponent },
  { path: 'nueva', component: FormRecetaComponent },
  { path: 'editar/:id', component: FormRecetaComponent },
  { path: ':id', component: VerRecetaComponent }
];

export default routes;
