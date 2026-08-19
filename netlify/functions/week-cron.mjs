import { maakWeek, vandaagNL, vorigeMaandag } from '../lib/week.mjs';

// Elke maandagochtend het overzicht van de week ervoor.
// De handmatige ingang zit in week-maken.mjs; beide draaien dezelfde logica.
export default async () => {
  try {
    const maandag = vorigeMaandag(vandaagNL());
    const uitkomst = await maakWeek(maandag);
    console.log(`Weekoverzicht ${maandag}: ${JSON.stringify(uitkomst)}`);
    return new Response(JSON.stringify({ ok: true, ...uitkomst }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('week-cron fout:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Maandag 06:00 UTC, dus 08:00 Nederlandse tijd in de zomer
export const config = { schedule: '0 6 * * 1' };
