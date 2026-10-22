import { Pipe, PipeTransform } from '@angular/core';
import { formatearEdad } from '../../core/utils/edad';

@Pipe({ name: 'edad' })
export class EdadPipe implements PipeTransform {
  transform(edad: number | null | undefined): string {
    return formatearEdad(edad);
  }
}
