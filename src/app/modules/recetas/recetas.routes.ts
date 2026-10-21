import { Routes } from '@angular/router';
import { ListaRecetasComponent } from './lista-recetas/lista-recetas.component';
import { FormRecetaComponent } from './form-receta/form-receta.component';
import { VerRecetaComponent } from './ver-receta/ver-receta.component';

const routes: Routes = [
  { path: '', component: ListaRecetasComponent, title: 'Recetas' },
  { path: 'nueva', component: FormRecetaComponent, title: 'Nueva receta' },
  { path: 'editar/:id', component: FormRecetaComponent, title: 'Editar receta' },
  { path: ':id', component: VerRecetaComponent, title: 'Receta médica' }
];

export default routes;
