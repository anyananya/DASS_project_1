// Simple ICS generator utilities
const escapeText = (s = '') => {
  return s.replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
};

const formatDateICS = (date) => {
  const d = new Date(date);
  // Format as YYYYMMDDTHHMMSSZ in UTC
  const pad = (n) => n.toString().padStart(2, '0');
  return d.getUTCFullYear().toString() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
};

const generateEventICS = ({ uid, title, description, location, start, end, url, organizerEmail }) => {
  const dtstart = formatDateICS(start);
  const dtend = formatDateICS(end);
  const lines = [];
  lines.push('BEGIN:VEVENT');
  lines.push('UID:' + (uid || `${Date.now()}@felicity.local`));
  lines.push('DTSTAMP:' + formatDateICS(new Date()));
  lines.push('DTSTART:' + dtstart);
  lines.push('DTEND:' + dtend);
  if (organizerEmail) lines.push('ORGANIZER:mailto:' + organizerEmail);
  lines.push('SUMMARY:' + escapeText(title || 'Event'));
  if (description) lines.push('DESCRIPTION:' + escapeText(description));
  if (location) lines.push('LOCATION:' + escapeText(location));
  if (url) lines.push('URL:' + url);
  lines.push('END:VEVENT');
  return lines.join('\r\n');
};

const wrapCalendar = (eventsICS) => {
  const header = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Felicity//EN'];
  const footer = ['END:VCALENDAR'];
  return header.concat(eventsICS, footer).join('\r\n');
};

module.exports = { generateEventICS, wrapCalendar };
