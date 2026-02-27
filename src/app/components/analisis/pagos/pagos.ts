import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PaypalService,
  PayPalTransactionsResponse,
  PayPalTransactionDetail,
} from '../../../services/paypal.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  templateUrl: './pagos.html',
  styleUrl: './pagos.scss',
})
export class PagosComponent {
  private readonly paypalService = inject(PaypalService);

  /** Rango por defecto: último mes */
  startDate = this.formatDateForInput(this.getDefaultStartDate());
  endDate = this.formatDateForInput(new Date());
  pageSize = 100;

  loading = false;
  error: string | null = null;
  data: PayPalTransactionsResponse | null = null;

  private getDefaultStartDate(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  }

  private formatDateForInput(d: Date): string {
    return d.toISOString().slice(0, 16);
  }

  /** Convierte fecha local (YYYY-MM-DDTHH:mm) a ISO 8601 para la API (máx 31 días). */
  private toISO8601(localDateTime: string): string {
    const d = new Date(localDateTime);
    return d.toISOString();
  }

  consultar(): void {
    this.error = null;
    this.data = null;
    const start = this.toISO8601(this.startDate);
    const end = this.toISO8601(this.endDate);
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const days = (endMs - startMs) / (1000 * 60 * 60 * 24);
    if (days > 31) {
      this.error = 'El rango de fechas no puede ser mayor a 31 días.';
      return;
    }
    if (days < 0) {
      this.error = 'La fecha de inicio debe ser anterior a la fecha de fin.';
      return;
    }

    this.loading = true;
    this.paypalService
      .getTransactions({
        start_date: start,
        end_date: end,
        page: 1,
        page_size: this.pageSize,
      })
      .then((res) => {
        this.data = res;
      })
      .catch((err: Error) => {
        this.error = err.message || 'Error al consultar PayPal.';
      })
      .finally(() => {
        this.loading = false;
      });
  }

  get details(): PayPalTransactionDetail[] {
    return this.data?.transaction_details ?? [];
  }

  get totalPages(): number {
    return this.data?.total_pages ?? 0;
  }

  get totalItems(): number {
    return this.data?.total_items ?? 0;
  }

  get currentPage(): number {
    return this.data?.page ?? 1;
  }

  formatMoney(currencyCode: string | undefined, value: string | undefined): string {
    if (value == null) return '—';
    const code = currencyCode || 'USD';
    const num = parseFloat(value);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: code,
    }).format(num);
  }

  formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  payerName(detail: PayPalTransactionDetail): string {
    const name = detail.payer_info?.payer_name;
    if (!name) return detail.payer_info?.email_address ?? '—';
    const parts = [name.given_name, name.surname].filter(Boolean);
    return parts.length ? parts.join(' ') : (name.alternate_full_name ?? '—');
  }
}
