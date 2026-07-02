export const INVOICE_PAGE_WIDTH = 794;

export const invoiceStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;500;600;700&display=swap');

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .classic-page {
    width: ${INVOICE_PAGE_WIDTH}px;
    min-height: 1123px;
    padding: 24px 22px 28px;
    font-family: Inter, 'Noto Sans Gujarati', system-ui, -apple-system, sans-serif;
    font-size: 10px;
    line-height: 1.4;
    color: #111827;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .classic-header {
    margin-bottom: 12px;
  }

  .classic-title-wrap {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 10px;
  }

  .classic-title {
    font-size: 22px;
    line-height: 1;
    color: #5f35c7;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .classic-meta {
    min-width: 255px;
    font-size: 14px;
    color: #111827;
  }

  .classic-meta > div {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    gap: 14px;
  }

  .classic-meta > div span {
    color: #4b5563;
    font-weight: 500;
  }

  .classic-meta > div strong {
    color: #111827;
    font-weight: 700;
  }

  .classic-branding {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  .classic-business-name {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.1;
    color: #111827;
    margin-bottom: 2px;
  }

  .classic-business-sub {
    color: #4b5563;
    font-size: 12px;
    font-weight: 500;
  }

  .classic-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }

  .classic-card {
    background: #ede9fb;
    border-radius: 8px;
    border: 1px solid #ddd6fe;
    padding: 10px 12px;
    min-height: 126px;
  }

  .classic-card h4 {
    color: #5f35c7;
    font-size: 15px;
    font-weight: 500;
    margin-bottom: 5px;
    line-height: 1.1;
  }

  .classic-card-name {
    font-weight: 700;
    color: #111827;
    margin-bottom: 2px;
    font-size: 11px;
  }

  .classic-card p {
    color: #374151;
    line-height: 1.4;
    font-size: 10px;
  }

  .classic-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    border-radius: 7px;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .classic-table thead th {
    background: #5f35c7;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 0 8px;
    height: 38px;
    line-height: 1;
    vertical-align: middle;
    font-size: 10px;
  }

  .classic-table tbody td {
    padding: 0 8px;
    height: 34px;
    line-height: 1;
    vertical-align: middle;
    border-bottom: 1px solid #e5e7eb;
    color: #374151;
    font-size: 10px;
  }

  .classic-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .classic-table tbody tr:nth-child(even) td {
    background: #f7f5fd;
  }

  .classic-col-index {
    width: 5%;
    text-align: center;
  }

  .classic-col-item {
    width: 30%;
  }

  .classic-col-item-plain {
    width: 55%;
  }

  .classic-col-gst,
  .classic-col-qty,
  .classic-col-rate,
  .classic-col-amt,
  .classic-col-cgst,
  .classic-col-sgst,
  .classic-col-total {
    width: 9.285%;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .classic-col-qty-plain {
    width: 12%;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .classic-col-rate-plain {
    width: 13%;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .classic-col-total-plain {
    width: 15%;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .classic-item-title {
    font-weight: 500;
    line-height: 1.25;
  }

  .classic-item-detail {
    font-size: 9px;
    color: #6b7280;
    margin-top: 4px;
    line-height: 1.2;
  }

  .classic-totals-row {
    margin-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
  }

  .classic-amount-words {
    flex: 1;
    padding-right: 12px;
  }

  .classic-summary-wrap {
    display: flex;
    justify-content: flex-end;
  }

  .classic-summary {
    width: 360px;
    border-collapse: collapse;
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    overflow: hidden;
    table-layout: fixed;
  }

  .classic-summary-wrap {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .classic-summary td {
    height: 34px;
    padding: 0 10px;
    border-bottom: 1px solid #e5e7eb;
    line-height: 1;
    vertical-align: middle;
    font-size: 10px;
  }

  .classic-summary td:last-child {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .classic-summary tr:last-child td {
    border-bottom: none;
  }

  .classic-row-bold td {
    font-weight: 700;
    background: #efe9fb;
  }

  .classic-row-final td {
    background: #5f35c7;
    color: #ffffff;
    font-weight: 700;
  }

  .classic-footer {
    margin-top: 12px;
    border-top: 1px solid #e5e7eb;
    padding-top: 8px;
    margin-top: auto;
  }

  .classic-footer p {
    font-size: 10px;
    color: #374151;
    line-height: 1.4;
    margin-bottom: 4px;
  }

  .classic-footer-strong {
    color: #111827;
    font-weight: 700;
  }
`;
