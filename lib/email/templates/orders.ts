import "server-only";

export interface OrderItemEmailData {
  name: string;
  quantity: number;
  totalPrice: number; // in PLN
}

export interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderType: "delivery" | "takeaway";
  paymentMethod: string;
  deliveryAddressSummary?: string | null;
  items: OrderItemEmailData[];
  subtotal: number;
  packagingTotal: number;
  deliveryFee: number;
  totalAmount: number;
  customerNotes?: string | null;
  etaMinutes?: number | null;
  rejectionReason?: string | null;
  approveUrl?: string;
  rejectUrl?: string;
  viewUrl?: string;
  lang?: "pl" | "en";
  restaurantContact?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

/**
 * Reusable HTML wrapper with Namaste premium light branding.
 */
function getEmailLayout(
  title: string,
  bodyContentHtml: string,
  contact?: { name: string; address: string; phone: string; email: string }
): string {
  const name = contact?.name || "Namaste Indian Restaurant";
  const address = contact?.address || "Warszawska 1/3, 06-400 Ciechanów, Poland";
  const phone = contact?.phone || "+48 511 984 331";
  const email = contact?.email || "info@namaste.pl";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://namaste-indian-restaurant.vercel.app";
  const logoUrl = `${siteUrl}/images/logo.png`;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      background-color: #FAF9F5;
      color: #121826;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #FFFFFF;
      border: 1px solid #EAE3D2;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(18, 24, 38, 0.03);
    }
    .header {
      background-color: #121826;
      padding: 30px 40px;
      text-align: center;
      border-bottom: 3px solid #9E690A;
    }
    .header h1 {
      color: #BF953F;
      font-family: "Georgia", serif;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 0.15em;
      margin: 0;
      text-transform: uppercase;
    }
    .header p {
      color: #EAE3D2;
      font-size: 10px;
      letter-spacing: 0.2em;
      margin: 5px 0 0 0;
      text-transform: uppercase;
    }
    .content {
      padding: 40px;
      line-height: 1.6;
      font-size: 14px;
    }
    .content h2 {
      font-family: "Georgia", serif;
      font-size: 18px;
      color: #121826;
      margin-top: 0;
      margin-bottom: 20px;
      border-bottom: 1px solid #EAE3D2;
      padding-bottom: 10px;
    }
    .details-table {
      width: 100%;
      margin: 20px 0;
      border-collapse: collapse;
      background: #FAF9F5;
      border: 1px solid #EAE3D2;
      border-radius: 4px;
    }
    .details-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #EAE3D2;
    }
    .details-table tr:last-child td {
      border-bottom: none;
    }
    .label {
      font-weight: bold;
      color: #718096;
      width: 40%;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    .value {
      color: #121826;
      font-weight: 600;
    }
    .items-list {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .items-list th {
      text-align: left;
      padding: 10px 12px;
      background: #121826;
      color: #FFFFFF;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .items-list td {
      padding: 12px;
      border-bottom: 1px solid #EAE3D2;
      font-size: 13px;
    }
    .pricing-summary {
      width: 50%;
      margin-left: auto;
      margin-top: 20px;
      border-collapse: collapse;
    }
    .pricing-summary td {
      padding: 6px 12px;
      font-size: 13px;
    }
    .pricing-summary .total-row td {
      border-top: 2px solid #9E690A;
      font-weight: bold;
      font-size: 15px;
      padding-top: 10px;
    }
    .btn {
      display: inline-block;
      background-color: #9E690A;
      color: #FFFFFF !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-align: center;
      margin: 15px 0;
    }
    .btn-secondary {
      background-color: #121826;
    }
    .btn-danger {
      background-color: #A52A2A;
    }
    .footer {
      background-color: #FAF9F5;
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid #EAE3D2;
      font-size: 11px;
      color: #718096;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header" style="text-align: left; padding: 25px 30px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="70" valign="middle" style="padding-right: 15px;">
            <img src="${logoUrl}" alt="Namaste Logo" width="60" height="60" style="display: block; border-radius: 50%; border: 2px solid #BF953F;" />
          </td>
          <td valign="middle" style="text-align: left;">
            <h1 style="color: #BF953F; font-family: 'Georgia', serif; font-size: 24px; font-weight: bold; letter-spacing: 0.15em; margin: 0; text-transform: uppercase; line-height: 1.1;">Namaste</h1>
            <p style="color: #EAE3D2; font-size: 10px; letter-spacing: 0.2em; margin: 4px 0 0 0; text-transform: uppercase; line-height: 1;">Indian Restaurant</p>
          </td>
        </tr>
      </table>
    </div>
    <div class="content">
      ${bodyContentHtml}
    </div>
    <div class="footer">
      <p><strong>${name}</strong></p>
      <p>${address}</p>
      <p>Phone: ${phone} | Email: ${email}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Helper to render payment method label.
 */
function getPaymentMethodLabel(method: string, lang: "pl" | "en"): string {
  const isPl = lang === "pl";
  switch (method) {
    case "cash_on_delivery":
      return isPl ? "Gotówka przy odbiorze" : "Cash on delivery";
    case "cash_on_pickup":
      return isPl ? "Gotówka przy odbiorze osobistym" : "Cash on pickup";
    case "card_on_delivery":
      return isPl ? "Karta przy odbiorze" : "Card on delivery";
    case "card_on_pickup":
      return isPl ? "Karta przy odbiorze osobistym" : "Card on pickup";
    default:
      return method;
  }
}

/**
 * Helper to render order items table.
 */
function renderItemsTable(items: OrderItemEmailData[], lang: "pl" | "en"): string {
  const isPl = lang === "pl";
  return `
    <table class="items-list">
      <thead>
        <tr>
          <th>${isPl ? "Danie" : "Dish"}</th>
          <th style="text-align: center; width: 80px;">${isPl ? "Ilość" : "Qty"}</th>
          <th style="text-align: right; width: 100px;">${isPl ? "Suma" : "Total"}</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td>${item.name}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right; font-weight: bold;">${item.totalPrice.toFixed(2)} zł</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

/**
 * Helper to render pricing totals.
 */
function renderPricingSummary(data: OrderEmailData, lang: "pl" | "en"): string {
  const isPl = lang === "pl";
  return `
    <table class="pricing-summary">
      <tr>
        <td style="color: #718096;">Subtotal:</td>
        <td style="text-align: right; font-weight: 500;">${data.subtotal.toFixed(2)} zł</td>
      </tr>
      <tr>
        <td style="color: #718096;">${isPl ? "Opakowania" : "Packaging"}:</td>
        <td style="text-align: right; font-weight: 500;">${data.packagingTotal.toFixed(2)} zł</td>
      </tr>
      ${
        data.orderType === "delivery"
          ? `<tr>
              <td style="color: #718096;">${isPl ? "Dostawa" : "Delivery"}:</td>
              <td style="text-align: right; font-weight: 500;">${data.deliveryFee.toFixed(2)} zł</td>
             </tr>`
          : ""
      }
      <tr class="total-row">
        <td>Total:</td>
        <td style="text-align: right; color: #9E690A;">${data.totalAmount.toFixed(2)} zł</td>
      </tr>
    </table>
  `;
}

/**
 * Customer email: Order request received.
 */
export function getOrderRequestReceivedCustomerTemplate(data: OrderEmailData): { subject: string; html: string } {
  const isPl = data.lang === "pl";
  const shortId = data.orderId.substring(0, 8).toUpperCase();
  const subject = isPl 
    ? `Otrzymaliśmy Twoje zamówienie #${shortId} — Namaste` 
    : `We received your order #${shortId} — Namaste`;

  const body = `
    <h2>${isPl ? "Potwierdzenie Otrzymania Zamówienia" : "Order Request Received"}</h2>
    <p>${
      isPl 
        ? `Witaj ${data.customerName}, dziękujemy za złożenie zamówienia. Otrzymaliśmy Twoją prośbę (ID: #${shortId}) i oczekuje ona na potwierdzenie przez kuchnię.` 
        : `Dear ${data.customerName}, thank you for your order. We have received your order request (ID: #${shortId}) and it is currently awaiting validation from our kitchen.`
    }</p>
    
    <table class="details-table">
      <tr>
        <td class="label">${isPl ? "Typ zamówienia" : "Type"}</td>
        <td class="value">${data.orderType === "delivery" ? (isPl ? "Dostawa" : "Delivery") : (isPl ? "Na wynos" : "Takeaway")}</td>
      </tr>
      <tr>
        <td class="label">${isPl ? "Płatność" : "Payment"}</td>
        <td class="value">${getPaymentMethodLabel(data.paymentMethod, data.lang || "pl")}</td>
      </tr>
      ${
        data.orderType === "delivery" && data.deliveryAddressSummary
          ? `<tr><td class="label">${isPl ? "Adres dostawy" : "Address"}</td><td class="value">${data.deliveryAddressSummary}</td></tr>`
          : ""
      }
    </table>

    <h3>${isPl ? "Podsumowanie zamówienia" : "Order Details"}</h3>
    ${renderItemsTable(data.items, data.lang || "pl")}
    ${renderPricingSummary(data, data.lang || "pl")}
  `;

  return { subject, html: getEmailLayout(subject, body, data.restaurantContact) };
}

/**
 * Customer email: Order approved.
 */
export function getOrderApprovedCustomerTemplate(data: OrderEmailData): { subject: string; html: string } {
  const isPl = data.lang === "pl";
  const shortId = data.orderId.substring(0, 8).toUpperCase();
  const subject = isPl 
    ? `Twoje zamówienie #${shortId} zostało zaakceptowane! — Namaste` 
    : `Your order #${shortId} has been approved! — Namaste`;

  const etaText = data.etaMinutes
    ? (isPl ? `Szacowany czas: <strong>${data.etaMinutes} minut</strong>` : `Estimated duration: <strong>${data.etaMinutes} minutes</strong>`)
    : "";

  const instructions = data.orderType === "takeaway"
    ? (isPl 
        ? "Twoje dania są przygotowywane. Zapraszamy po odbiór osobisty w restauracji: Warszawska 1/3, Ciechanów." 
        : "Your dishes are being prepared. Please pick up your order at our restaurant: Warszawska 1/3, Ciechanów.")
    : (isPl
        ? `Twoje zamówienie jest przygotowywane i zostanie dostarczone na adres: <strong>${data.deliveryAddressSummary}</strong>.`
        : `Your order is in preparation and will be delivered to: <strong>${data.deliveryAddressSummary}</strong>.`);

  const body = `
    <h2>${isPl ? "Zamówienie Zaakceptowane!" : "Order Confirmed!"}</h2>
    <p>${
      isPl 
        ? `Witaj ${data.customerName}, Twoje zamówienie #${shortId} zostało zaakceptowane i przekazane do kuchni.` 
        : `Dear ${data.customerName}, your order #${shortId} has been validated and is now being prepared.`
    }</p>

    <div style="background-color: #FAF9F5; border-left: 4px solid #9E690A; padding: 15px; margin: 20px 0; font-size: 14px;">
      ${etaText ? `<p style="margin: 0 0 10px 0;">${etaText}</p>` : ""}
      <p style="margin: 0;">${instructions}</p>
    </div>

    <h3>${isPl ? "Zamówione pozycje" : "Items Ordered"}</h3>
    ${renderItemsTable(data.items, data.lang || "pl")}
    ${renderPricingSummary(data, data.lang || "pl")}
  `;

  return { subject, html: getEmailLayout(subject, body, data.restaurantContact) };
}

/**
 * Customer email: Order rejected.
 */
export function getOrderRejectedCustomerTemplate(data: OrderEmailData): { subject: string; html: string } {
  const isPl = data.lang === "pl";
  const shortId = data.orderId.substring(0, 8).toUpperCase();
  const subject = isPl 
    ? `Zamówienie #${shortId} nie zostało zaakceptowane — Namaste` 
    : `Order #${shortId} could not be accepted — Namaste`;

  const body = `
    <h2>${isPl ? "Anulowanie Zamówienia" : "Order Cancellation Update"}</h2>
    <p>${
      isPl 
        ? `Witaj ${data.customerName}, z przykrością informujemy, że restauracja nie jest w stanie zrealizować Twojego zamówienia #${shortId} w wybranym czasie.` 
        : `Dear ${data.customerName}, we regret to inform you that the restaurant cannot fulfill your order #${shortId} at this moment.`
    }</p>

    ${
      data.rejectionReason
        ? `<div style="background-color: #FAF9F5; border-left: 4px solid #A52A2A; padding: 15px; margin: 20px 0; font-size: 13px;">
            <strong>${isPl ? "Powód odmowy / Reason:" : "Reason:"}</strong> ${data.rejectionReason}
           </div>`
        : ""
    }

    <p>${
      isPl 
        ? "Środki nie zostały pobrane, a płatność (jeśli dotyczy) została anulowana. Zapraszamy do kontaktu telefonicznego w celu wyjaśnienia szczegółów." 
        : "Any pending charge/authorization has been cancelled. Please contact us directly by phone if you need further assistance."
    }</p>
  `;

  return { subject, html: getEmailLayout(subject, body, data.restaurantContact) };
}

/**
 * Customer email: Takeaway ready for pickup.
 */
export function getOrderReadyForPickupCustomerTemplate(data: OrderEmailData): { subject: string; html: string } {
  const isPl = data.lang === "pl";
  const shortId = data.orderId.substring(0, 8).toUpperCase();
  const subject = isPl 
    ? `Twoje zamówienie #${shortId} jest gotowe do odbioru! — Namaste` 
    : `Your order #${shortId} is ready for pickup! — Namaste`;

  const body = `
    <h2>${isPl ? "Zamówienie Gotowe do Odbioru" : "Order Ready for Pickup"}</h2>
    <p>${
      isPl 
        ? `Witaj ${data.customerName}, Twoje zamówienie #${shortId} zostało przygotowane. Możesz je odebrać w restauracji.` 
        : `Dear ${data.customerName}, your order #${shortId} is ready. You can now collect it from the counter.`
    }</p>

    <div style="background-color: #FAF9F5; border: 1px dashed #BF953F; padding: 15px; margin: 20px 0; text-align: center; border-radius: 4px;">
      <p style="margin: 0; font-weight: bold; color: #9E690A; font-size: 15px;">
        ${isPl ? "Zapraszamy po odbiór!" : "Ready for collection!"}
      </p>
      <p style="margin: 5px 0 0 0; font-size: 12px; color: #718096;">
        Warszawska 1/3, 06-400 Ciechanów | Tel: +48 511 984 331
      </p>
    </div>

    <h3>${isPl ? "Szczegóły płatności" : "Payment details"}</h3>
    <p>
      <strong>${isPl ? "Metoda płatności:" : "Payment method:"}</strong> ${getPaymentMethodLabel(data.paymentMethod, data.lang || "pl")}<br />
      <strong>${isPl ? "Do zapłaty:" : "Amount due:"}</strong> ${data.totalAmount.toFixed(2)} zł
    </p>
  `;

  return { subject, html: getEmailLayout(subject, body, data.restaurantContact) };
}

/**
 * Customer email: Delivery delivered/completed.
 */
export function getOrderDeliveredCustomerTemplate(data: OrderEmailData): { subject: string; html: string } {
  const isPl = data.lang === "pl";
  const shortId = data.orderId.substring(0, 8).toUpperCase();
  const subject = isPl 
    ? `Dziękujemy za zamówienie #${shortId}! — Namaste` 
    : `Thank you for order #${shortId}! — Namaste`;

  const body = `
    <h2>${isPl ? "Zamówienie Doręczone" : "Order Delivered"}</h2>
    <p>${
      isPl 
        ? `Witaj ${data.customerName}, Twoje zamówienie #${shortId} zostało oznaczone jako doręczone. Mamy nadzieję, że jedzenie Ci smakowało!` 
        : `Dear ${data.customerName}, your order #${shortId} has been successfully delivered. We hope you enjoyed your meal!`
    }</p>

    <p style="font-size: 15px; font-weight: bold; color: #9E690A; text-align: center; margin: 35px 0 20px 0;">
      Smacznego! / Bon Appétit!
    </p>

    <div class="divider"></div>

    <p style="font-size: 11px; text-align: center; color: #718096; line-height: 1.4;">
      ${
        isPl 
          ? "Jeśli masz jakiekolwiek uwagi do swojego zamówienia, podziel się nimi dzwoniąc do nas bezpośrednio." 
          : "If you have any feedback regarding your order, please do not hesitate to contact us directly by phone."
      }
    </p>
  `;

  return { subject, html: getEmailLayout(subject, body, data.restaurantContact) };
}

/**
 * Admin email: New order request needs action.
 */
export function getOrderNewAdminTemplate(data: OrderEmailData): { subject: string; html: string } {
  const shortId = data.orderId.substring(0, 8).toUpperCase();
  const typeLabel = data.orderType.toUpperCase();
  const subject = `[New Order] #${shortId} - ${typeLabel} @ ${data.totalAmount.toFixed(2)} PLN`;

  const body = `
    <h2>New Order Pending Approval</h2>
    <p>A new order #${shortId} has been submitted by a customer and requires your validation.</p>
    
    <table class="details-table">
      <tr>
        <td class="label">Order Number</td>
        <td class="value">#${shortId}</td>
      </tr>
      <tr>
        <td class="label">Customer Name</td>
        <td class="value">${data.customerName}</td>
      </tr>
      <tr>
        <td class="label">Phone</td>
        <td class="value">${data.customerPhone}</td>
      </tr>
      <tr>
        <td class="label">Email</td>
        <td class="value">${data.customerEmail}</td>
      </tr>
      <tr>
        <td class="label">Order Type</td>
        <td class="value" style="font-weight: bold; color: #9E690A;">${typeLabel}</td>
      </tr>
      <tr>
        <td class="label">Payment Method</td>
        <td class="value">${getPaymentMethodLabel(data.paymentMethod, "en")}</td>
      </tr>
      ${
        data.orderType === "delivery" && data.deliveryAddressSummary
          ? `<tr><td class="label">Delivery Address</td><td class="value">${data.deliveryAddressSummary}</td></tr>`
          : ""
      }
      ${
        data.customerNotes
          ? `<tr><td class="label">Customer Notes</td><td class="value">${data.customerNotes}</td></tr>`
          : ""
      }
    </table>

    <h3>Items Summary</h3>
    ${renderItemsTable(data.items, "en")}
    ${renderPricingSummary(data, "en")}

    <div style="text-align: center; margin-top: 30px;">
      ${
        data.approveUrl
          ? `<a href="${data.approveUrl}" class="btn" style="margin-right: 10px;">Approve Order</a>`
          : ""
      }
      ${
        data.rejectUrl
          ? `<a href="${data.rejectUrl}" class="btn btn-danger" style="margin-right: 10px;">Reject Order</a>`
          : ""
      }
      ${
        data.viewUrl
          ? `<a href="${data.viewUrl}" class="btn btn-secondary">View in Admin Panel</a>`
          : ""
      }
    </div>
  `;

  return { subject, html: getEmailLayout(subject, body, data.restaurantContact) };
}
