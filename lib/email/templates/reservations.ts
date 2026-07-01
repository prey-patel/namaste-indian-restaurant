import "server-only";

export interface ReservationEmailData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reservationDate: string;
  reservationTime: string;
  guestsCount: number;
  specialRequests?: string | null;
  tableNumber?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  approveUrl?: string;
  rejectUrl?: string;
  viewUrl?: string;
  referenceCode?: string;
  logoUrl?: string;
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
  contact?: { name: string; address: string; phone: string; email: string },
  customLogoUrl?: string
): string {
  const name = contact?.name || "Namaste Indian Restaurant";
  const address = contact?.address || "Warszawska 1/3, 06-400 Ciechanów, Poland";
  const phone = contact?.phone || "+48 511 984 331";
  const email = contact?.email || "info@namaste.pl";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://namaste-ciechanow.pl";
  const logoUrl = customLogoUrl || `${siteUrl}/images/logo.png`;
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
    .divider {
      height: 1px;
      background-color: #EAE3D2;
      margin: 25px 0;
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
 * Helper to render tracking details in reservation emails
 */
function getTrackingSectionHtml(data: ReservationEmailData): string {
  if (!data.referenceCode || !data.viewUrl) return "";

  const isPl = data.lang === "pl";
  return `
    <div style="background-color: #FAF9F5; border: 1px solid #EAE3D2; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #D4AF37;">
        ${isPl ? "Śledzenie statusu" : "Status Tracking"}
      </p>
      <p style="margin: 0 0 15px 0; font-size: 13px; color: #4A5568;">
        ${isPl ? "Twój kod referencyjny:" : "Your reference code:"} <br />
        <strong style="font-family: monospace; font-size: 14px; background-color: #EDF2F7; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-top: 6px; border: 1px solid #CBD5E0; color: #1A202C;">${data.referenceCode}</strong>
      </p>
      <a href="${data.viewUrl}" style="background-color: #D4AF37; color: #000000; font-weight: bold; font-size: 11px; text-decoration: none; padding: 10px 20px; border-radius: 6px; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 5px;">
        ${isPl ? "Sprawdź Status Rezerwacji" : "Check Reservation Status"}
      </a>
    </div>
  `;
}

/**
 * Customer email: Reservation request received.
 */
export function getReservationRequestReceivedCustomerTemplate(data: ReservationEmailData): { subject: string; html: string } {
  const isPl = data.lang === "pl";
  const subject = isPl 
    ? "Otrzymaliśmy Twoją prośbę o rezerwację — Namaste" 
    : "We received your reservation request — Namaste";

  const body = `
    <h2>${isPl ? "Prośba o rezerwację stolika" : "Table Reservation Request"}</h2>
    <p>${
      isPl 
        ? `Witaj ${data.customerName}, otrzymaliśmy Twoje zapytanie o rezerwację. Rezerwacja oczekuje obecnie na potwierdzenie przez restaurację. Wyślemy Ci kolejną wiadomość e-mail, gdy tylko zostanie zatwierdzona.` 
        : `Dear ${data.customerName}, we have received your booking request. Your reservation is currently pending confirmation from our staff. We will send you an email update as soon as it is confirmed.`
    }</p>
    
    <table class="details-table">
      <tr>
        <td class="label">${isPl ? "Data" : "Date"}</td>
        <td class="value">${data.reservationDate}</td>
      </tr>
      <tr>
        <td class="label">${isPl ? "Godzina" : "Time"}</td>
        <td class="value">${data.reservationTime}</td>
      </tr>
      <tr>
        <td class="label">${isPl ? "Liczba gości" : "Guests"}</td>
        <td class="value">${data.guestsCount}</td>
      </tr>
      ${
        data.specialRequests
          ? `<tr><td class="label">${isPl ? "Uwagi" : "Special Requests"}</td><td class="value">${data.specialRequests}</td></tr>`
          : ""
      }
    </table>
    
    <p style="font-size: 12px; color: #718096; font-style: italic;">
      ${
        isPl
          ? "Jeśli chcesz zmienić lub anulować tę rezerwację, skontaktuj się z nami telefonicznie."
          : "If you need to change or cancel this request, please contact us by phone."
      }
    </p>

    ${getTrackingSectionHtml(data)}
  `;

  return { subject, html: getEmailLayout(subject, body, data.restaurantContact, data.logoUrl) };
}

/**
 * Customer email: Reservation confirmed.
 */
export function getReservationConfirmedCustomerTemplate(data: ReservationEmailData): { subject: string; html: string } {
  const isPl = data.lang === "pl";
  const subject = isPl 
    ? "Twoja rezerwacja została potwierdzona! — Namaste" 
    : "Your reservation has been confirmed! — Namaste";

  const body = `
    <h2>${isPl ? "Rezerwacja Potwierdzona" : "Reservation Confirmed"}</h2>
    <p>${
      isPl 
        ? `Wspaniałe wieści, ${data.customerName}! Twoja rezerwacja stolika została oficjalnie potwierdzona.` 
        : `Great news, ${data.customerName}! Your table booking is officially confirmed.`
    }</p>
    
    <table class="details-table">
      <tr>
        <td class="label">${isPl ? "Data" : "Date"}</td>
        <td class="value">${data.reservationDate}</td>
      </tr>
      <tr>
        <td class="label">${isPl ? "Godzina" : "Time"}</td>
        <td class="value">${data.reservationTime}</td>
      </tr>
      <tr>
        <td class="label">${isPl ? "Liczba gości" : "Guests"}</td>
        <td class="value">${data.guestsCount}</td>
      </tr>
      ${
        data.tableNumber
          ? `<tr><td class="label">${isPl ? "Stolik" : "Table"}</td><td class="value">${data.tableNumber}</td></tr>`
          : ""
      }
    </table>

    <p>${isPl ? "Czekamy na Ciebie w naszej restauracji!" : "We look forward to welcoming you to our restaurant!"}</p>

    ${getTrackingSectionHtml(data)}
  `;

  return { subject, html: getEmailLayout(subject, body, data.restaurantContact, data.logoUrl) };
}

/**
 * Customer email: Reservation rejected.
 */
export function getReservationRejectedCustomerTemplate(data: ReservationEmailData): { subject: string; html: string } {
  const isPl = data.lang === "pl";
  const subject = isPl 
    ? "Aktualizacja statusu rezerwacji — Namaste" 
    : "Reservation status update — Namaste";

  const body = `
    <h2>${isPl ? "Rezerwacja nie może zostać zaakceptowana" : "Reservation Request Update"}</h2>
    <p>${
      isPl 
        ? `Witaj ${data.customerName}, z przykrością informujemy, że nie jesteśmy w stanie zaakceptować Twojej rezerwacji stolika w wybranym terminie.` 
        : `Dear ${data.customerName}, we regret to inform you that we are unable to accept your table reservation for the requested date and time.`
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
        ? "Zachęcamy do spróbowania innego terminu lub kontaktu telefonicznego w celu dopasowania wolnego stolika." 
        : "Please feel free to try another date/time or contact us directly by phone to find an available spot."
    }</p>

    ${getTrackingSectionHtml(data)}
  `;

  return { subject, html: getEmailLayout(subject, body, data.restaurantContact, data.logoUrl) };
}

/**
 * Customer email: Reservation cancelled.
 */
export function getReservationCancelledCustomerTemplate(data: ReservationEmailData): { subject: string; html: string } {
  const isPl = data.lang === "pl";
  const subject = isPl 
    ? "Twoja rezerwacja została anulowana — Namaste" 
    : "Your reservation has been cancelled — Namaste";

  const body = `
    <h2>${isPl ? "Rezerwacja Anulowana" : "Reservation Cancelled"}</h2>
    <p>${
      isPl 
        ? `Witaj ${data.customerName}, Twoja potwierdzona rezerwacja na dzień <strong>${data.reservationDate}</strong> została anulowana.` 
        : `Dear ${data.customerName}, your confirmed table booking for <strong>${data.reservationDate}</strong> has been cancelled.`
    }</p>
    
    ${
      data.cancellationReason
        ? `<div style="background-color: #FAF9F5; border-left: 4px solid #A52A2A; padding: 15px; margin: 20px 0; font-size: 13px;">
            <strong>${isPl ? "Powód anulowania / Reason:" : "Reason:"}</strong> ${data.cancellationReason}
           </div>`
        : ""
    }

    <p>${
      isPl 
        ? "W razie pytań prosimy o kontakt telefoniczny z restauracją." 
        : "If you have any questions, please contact the restaurant directly by phone."
    }</p>

    ${getTrackingSectionHtml(data)}
  `;

  return { subject, html: getEmailLayout(subject, body, data.restaurantContact, data.logoUrl) };
}

/**
 * Admin email: New reservation request needs action.
 */
export function getReservationNewAdminTemplate(data: ReservationEmailData): { subject: string; html: string } {
  const subject = `[New Reservation] ${data.customerName} - ${data.guestsCount} guests @ ${data.reservationDate} ${data.reservationTime}`;

  const body = `
    <h2>New Reservation Pending</h2>
    <p>A new reservation request has been submitted and is awaiting your action.</p>
    
    <table class="details-table">
      <tr>
        <td class="label">Customer Name</td>
        <td class="value">${data.customerName}</td>
      </tr>
      <tr>
        <td class="label">Phone Number</td>
        <td class="value">${data.customerPhone}</td>
      </tr>
      <tr>
        <td class="label">Email Address</td>
        <td class="value">${data.customerEmail}</td>
      </tr>
      <tr>
        <td class="label">Date</td>
        <td class="value">${data.reservationDate}</td>
      </tr>
      <tr>
        <td class="label">Time</td>
        <td class="value">${data.reservationTime}</td>
      </tr>
      <tr>
        <td class="label">Guests Count</td>
        <td class="value">${data.guestsCount}</td>
      </tr>
      ${
        data.specialRequests
          ? `<tr><td class="label">Notes</td><td class="value">${data.specialRequests}</td></tr>`
          : ""
      }
    </table>

    <div style="text-align: center; margin-top: 30px;">
      ${
        data.approveUrl
          ? `<a href="${data.approveUrl}" class="btn" style="margin-right: 10px;">Approve Booking</a>`
          : ""
      }
      ${
        data.rejectUrl
          ? `<a href="${data.rejectUrl}" class="btn btn-danger" style="margin-right: 10px;">Reject Booking</a>`
          : ""
      }
      ${
        data.viewUrl
          ? `<a href="${data.viewUrl}" class="btn btn-secondary">View in Admin Panel</a>`
          : ""
      }
    </div>
  `;

  return { subject, html: getEmailLayout(subject, body, data.restaurantContact, data.logoUrl) };
}
