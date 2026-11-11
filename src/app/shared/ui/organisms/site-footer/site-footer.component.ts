import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_CONFIG } from '../../../../core/config/site.config';
import { BrandComponent } from '../../molecules/brand/brand.component';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink, BrandComponent],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss'
})
export class SiteFooterComponent {
  readonly enInicio = input<boolean>(false);
  readonly autenticado = input<boolean>(false);

  readonly irInicio = output<void>();
  readonly abrirPrestamos = output<void>();
  readonly abrirBusquedaAvanzada = output<void>();
  readonly cerrarSesion = output<void>();

  readonly config = SITE_CONFIG;
  readonly anioActual = new Date().getFullYear();

  readonly tieneContactoExplicito = computed<boolean>(() => {
    const c = this.config.contacto;
    return Boolean(c.direccion || c.correo || c.telefono || c.horario);
  });
}
