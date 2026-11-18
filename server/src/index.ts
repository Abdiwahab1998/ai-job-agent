import express from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '0.1.0' }));

const searchSchema = z.object({ query: z.string().trim().min(2).max(120), location: z.string().trim().max(120).optional() });
app.get('/api/jobs', async (req, res) => {
  const data = searchSchema.safeParse(req.query);
  if (!data.success) { res.status(400).json({ error: 'Ange ett yrke med minst 2 tecken.' }); return; }
  const { query, location } = data.data;
  const params = new URLSearchParams({ q: [query, location].filter(Boolean).join(' '), limit: '15' });
  try {
    const response = await fetch(`https://jobsearch.api.jobtechdev.se/search?${params.toString()}`, {
      headers: { accept: 'application/json', 'user-agent': 'AIJobAgentStarter/0.1 educational prototype' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`JobSearch HTTP ${response.status}`);
    const json = await response.json() as { hits?: Array<Record<string, unknown>> };
    const jobs = (json.hits ?? []).map((h) => {
      const employer = h.employer as { name?: string } | undefined;
      const workplace = h.workplace_address as { municipality?: string } | undefined;
      const description = h.description as { text?: string; text_formatted?: string } | undefined;
      const urls = h.application_details as { url?: string } | undefined;
      return {
        id: String(h.id ?? ''),
        title: String(h.headline ?? 'Okänd tjänst'),
        company: employer?.name ?? 'Okänd arbetsgivare',
        location: workplace?.municipality ?? '',
        description: (description?.text ?? (description?.text_formatted ?? '').replace(/<[^>]*>/g, ' ')).slice(0, 12000),
        url: String(urls?.url ?? h.webpage_url ?? ''),
      };
    });
    res.json({ jobs, source: 'Arbetsförmedlingen JobSearch' });
  } catch (error) {
    console.error('JobSearch request failed:', error);
    res.status(502).json({ error: 'Kunde inte hämta jobb just nu. Försök igen senare.' });
  }
});

const analysisSchema = z.object({ cv: z.string().min(30).max(30000), description: z.string().min(20).max(30000) });
const STOP = new Set(['och','eller','med','för','som','att','ett','den','det','har','ska','kan','från','till','hos','dig','din','dina','you','the','and','with','this','that','are','our','will','have','your','work','job','experience','arbete','erfarenhet','söker','rollen','tjänsten','inom','efter','även','samt','inte','mer','alla','vi','du','en','på','av','i','är','om','de','it','a','to','of','in','is','as','or','we','be']);
function tokens(s: string) {
  return [...new Set((s.toLocaleLowerCase('sv-SE').match(/[a-zåäöéü0-9+#.]{3,}/g) ?? [])
    .filter((w) => !STOP.has(w)))];
}
app.post('/api/analyze', (req, res) => {
  const parsed = analysisSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Klistra in CV-text och en jobbannons med tillräcklig information.' }); return; }
  const cvSet = new Set(tokens(parsed.data.cv));
  const keywords = tokens(parsed.data.description).slice(0, 100);
  const matched = keywords.filter((word) => cvSet.has(word));
  const missing = keywords.filter((word) => !cvSet.has(word));
  const coverage = keywords.length ? Math.round(matched.length / keywords.length * 100) : 0;
  res.json({ coverage, matched: matched.slice(0, 25), missing: missing.slice(0, 25), note: 'Enkel ordöverlappning, inte ATS-godkännande eller AI-bedömning. Saknade ord ska inte läggas till om de inte är sanna.' });
});

const emailSchema = z.object({ name: z.string().trim().min(2).max(100), title: z.string().trim().min(2).max(140), company: z.string().trim().min(2).max(140) });
app.post('/api/email-draft', (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Ange namn, tjänst och företag.' }); return; }
  const { name, title, company } = parsed.data;
  res.json({ subject: `Uppföljning av ansökan – ${title}`, body: `Hej!\n\nJag har nyligen skickat in en ansökan till tjänsten som ${title} hos ${company}. Jag vill gärna bekräfta att min ansökan har kommit fram och samtidigt uttrycka mitt intresse för tjänsten.\n\nTack för er tid!\n\nMed vänliga hälsningar,\n${name}`, sent: false });
});

// IMPORTANT: No endpoint sends applications or emails in this prototype.
// Real sending requires supported providers, explicit authorization, verification, audit logs and idempotency.
app.listen(3001, () => console.log('API startad: http://localhost:3001'));
