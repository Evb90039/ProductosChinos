import { Injectable } from '@angular/core';

/** Respuesta de la API Transaction Search de PayPal (v1/reporting/transactions). */
export interface PayPalTransactionsResponse {
  transaction_details?: PayPalTransactionDetail[];
  account_number?: string;
  last_refreshed_datetime?: string;
  page?: number;
  total_items?: number;
  total_pages?: number;
  links?: { href: string; rel: string; method: string }[];
}

export interface PayPalTransactionDetail {
  transaction_info?: {
    transaction_id?: string;
    transaction_event_code?: string;
    transaction_initiation_date?: string;
    transaction_updated_date?: string;
    transaction_amount?: { currency_code?: string; value?: string };
    fee_amount?: { currency_code?: string; value?: string };
    transaction_status?: string;
    transaction_subject?: string;
    invoice_id?: string;
    payer_transaction_id?: string;
  };
  payer_info?: {
    email_address?: string;
    payer_name?: { given_name?: string; surname?: string; alternate_full_name?: string };
    country_code?: string;
  };
}

/** Parámetros para listar transacciones. Rango máximo 31 días. */
export interface PayPalTransactionsParams {
  start_date: string; // ISO 8601, ej. 2025-02-01T00:00:00Z
  end_date: string;
  page?: number;
  page_size?: number; // máx 500
}

@Injectable({ providedIn: 'root' })
export class PaypalService {
  /** Base URL de la Netlify Function (mismo origen en producción; con netlify dev también). */
  private get baseUrl(): string {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }

  private get functionUrl(): string {
    return `${this.baseUrl}/.netlify/functions/paypal-transactions`;
  }

  /**
   * Obtiene las transacciones/pagos del rango de fechas indicado.
   * Requiere que en Netlify estén configuradas PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET,
   * y que en la app de PayPal esté activado el permiso "Transaction Search".
   */
  async getTransactions(params: PayPalTransactionsParams): Promise<PayPalTransactionsResponse> {
    const search = new URLSearchParams();
    search.set('start_date', params.start_date);
    search.set('end_date', params.end_date);
    if (params.page != null) search.set('page', String(params.page));
    if (params.page_size != null) search.set('page_size', String(Math.min(params.page_size, 500)));

    const url = `${this.functionUrl}?${search.toString()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.error || body?.detail || `Error ${res.status}: ${res.statusText}`);
    }
    return body as PayPalTransactionsResponse;
  }
}
