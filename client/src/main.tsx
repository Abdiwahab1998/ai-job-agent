
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BriefcaseBusiness,
  FileSearch,
  Mail,
  ShieldCheck,
  Search,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import './style.css';

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
};

type Analysis = {
  coverage: number;
  matched: string[];
  missing: string[];
  note: string;
};

type Draft = {
  subject: string;
  body: string;
  sent: boolean;
};

async function post<T>(
  path: string,
  payload: unknown
): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Något gick fel');
  }

  return data as T;
}

function App() {
  const [query, setQuery] = useState('systemutvecklare');
  const [location, setLocation] = useState('Göteborg');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);

  const [cv, setCv] = useState('');
  const [cvFileName, setCvFileName] = useState('');
  const [cvLoading, setCvLoading] = useState(false);
  const [cvMessage, setCvMessage] = useState('');

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [name, setName] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ladda upp och läs PDF eller DOCX lokalt.
  async function importCV(file?: File) {
    if (!file) return;

    setError('');
    setCvMessage('');
    setCvFileName('');
    setAnalysis(null);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!['pdf', 'docx'].includes(ext ?? '')) {
      setError('Välj en PDF- eller DOCX-fil.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Filen får vara högst 5 MB.');
      return;
    }

    setCvLoading(true);

    try {
      let extracted = '';

      if (ext === 'docx') {
        const mammoth = await import('mammoth');

        const result = await mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        });

        extracted = result.value;
      } else {
        const pdfjs = await import('pdfjs-dist');

        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        const pdfDocument = await pdfjs.getDocument({
          data: new Uint8Array(await file.arrayBuffer()),
        }).promise;

        if (pdfDocument.numPages > 15) {
          throw new Error(
            'Första versionen stöder högst 15 sidor.'
          );
        }

        const pages: string[] = [];

        for (
          let pageNumber = 1;
          pageNumber <= pdfDocument.numPages;
          pageNumber++
        ) {
          const page = await pdfDocument.getPage(pageNumber);
          const content = await page.getTextContent();

          const pageText = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ');

          pages.push(pageText);
        }

        extracted = pages.join('\n\n');
      }

      extracted = extracted.replace(/\u0000/g, '').trim();

      if (extracted.length < 30) {
        throw new Error(
          'Kunde inte läsa tillräckligt med text. ' +
          'Skannade PDF-filer kan behöva OCR.'
        );
      }

      if (extracted.length > 30000) {
        throw new Error(
          'CV-texten är för lång. Max 30 000 tecken.'
        );
      }

      setCv(extracted);
      setCvFileName(file.name);

      setCvMessage(
        'CV-texten har lästs in lokalt. ' +
        'Granska informationen innan analys. ' +
        'Ingen fil har skickats till servern.'
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Kunde inte läsa filen.'
      );
    } finally {
      setCvLoading(false);
    }
  }

  // Sök efter lediga jobb.
  async function findJobs() {
    setLoading(true);
    setError('');
    setSelected(null);
    setAnalysis(null);
    setDraft(null);

    try {
      const params = new URLSearchParams({
        query,
        location,
      });

      const response = await fetch(`/api/jobs?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Kunde inte söka jobb.');
      }

      setJobs(data.jobs ?? []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : String(e)
      );
    } finally {
      setLoading(false);
    }
  }

  // Jämför CV-texten med den valda jobbannonsen.
  async function analyze() {
    if (!selected) return;

    setLoading(true);
    setError('');

    try {
      const result = await post<Analysis>('/api/analyze', {
        cv,
        description: selected.description,
      });

      setAnalysis(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : String(e)
      );
    } finally {
      setLoading(false);
    }
  }

  // Generera ett mejlutkast. Skickar inget mejl.
  async function makeDraft() {
    if (!selected) return;

    setLoading(true);
    setError('');

    try {
      const result = await post<Draft>('/api/email-draft', {
        name,
        title: selected.title,
        company: selected.company,
      });

      setDraft(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : String(e)
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <div className="logo">
          <Sparkles size={23} />
          AI Job Agent
          <span>PROTOTYP</span>
        </div>

        <div className="subtitle">
          Din framtida automatiska jobbassistent
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">
            <ShieldCheck size={16} />
            Säkert utvecklingsläge – ingenting skickas
          </div>

          <h1>
            Hitta jobb. Matcha ditt CV.
            <br />
            <em>Automatisera nästa steg.</em>
          </h1>

          <p>
            Sök riktiga svenska jobbannonser, ladda upp
            ditt CV och analysera hur väl det matchar
            en tjänst. Automatiska ansökningar kommer
            i en senare version.
          </p>
        </section>

        {/* JOBBSÖKNING */}
        <section className="card">
          <h2>
            <Search size={19} />
            Hitta lediga jobb
          </h2>

          <div className="inputs">
            <label>
              Yrke eller sökord
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <label>
              Ort
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>

            <button
              disabled={loading}
              onClick={findJobs}
            >
              {loading ? 'Arbetar...' : 'Sök jobb'}
            </button>
          </div>

          <div className="jobs">
            {jobs.map((job) => (
              <button
                key={job.id}
                className={`job ${
                  selected?.id === job.id ? 'active' : ''
                }`}
                onClick={() => {
                  setSelected(job);
                  setAnalysis(null);
                  setDraft(null);
                }}
              >
                <strong>{job.title}</strong>
                <span>
                  {job.company} · {job.location}
                </span>
              </button>
            ))}
          </div>

          {jobs.length > 0 && (
            <small>
              Källa: Arbetsförmedlingen JobSearch.
              Välj ett jobb för att analysera det.
            </small>
          )}
        </section>

        {/* NY FUNKTION: CV-UPPLADDNING */}
        <section className="card">
          <h2>
            <UploadCloud size={19} />
            Ladda upp ditt CV
          </h2>

          <p>
            Ladda upp ditt befintliga CV i PDF-
            eller DOCX-format. Maximal filstorlek
            är 5 MB.
          </p>

          <label>
            Välj CV-fil
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={cvLoading}
              onChange={(e) => {
                void importCV(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>

          {cvLoading && (
            <p role="status">Läser CV...</p>
          )}

          {cvMessage && (
            <div className="result" role="status">
              <strong>{cvFileName}</strong>
              <p>{cvMessage}</p>
            </div>
          )}

          {cv && (
            <label>
              Kontrollera och redigera CV-texten
              <textarea
                rows={9}
                value={cv}
                onChange={(e) => {
                  setCv(e.target.value);
                  setAnalysis(null);
                }}
              />
            </label>
          )}
        </section>

        {/* VALD JOBBANNONS OCH CV-ANALYS */}
        {selected && (
          <section className="card">
            <h2>
              <BriefcaseBusiness size={19} />
              Vald tjänst
            </h2>

            <h3>{selected.title}</h3>

            <p>
              {selected.company} · {selected.location}
            </p>

            <div className="description">
              {selected.description.slice(0, 1800)}
              {selected.description.length > 1800
                ? '…'
                : ''}
            </div>

            <h2>
              <FileSearch size={19} />
              CV-matchning
            </h2>

            <p>
              Använd ditt uppladdade CV eller
              skriv in CV-texten nedan.
            </p>

            <label>
              CV-text
              <textarea
                rows={7}
                value={cv}
                onChange={(e) => {
                  setCv(e.target.value);
                  setAnalysis(null);
                }}
                placeholder="Ditt verkliga CV-innehåll..."
              />
            </label>

            <button
              disabled={
                loading ||
                cv.trim().length < 30 ||
                selected.description.length < 20
              }
              onClick={analyze}
            >
              Analysera CV
            </button>

            {analysis && (
              <div className="result">
                <strong>
                  Ordöverlappning: {analysis.coverage}%
                </strong>

                <p>{analysis.note}</p>

                <div>
                  <b>Hittade termer: </b>
                  {analysis.matched.join(', ') || 'Inga'}
                </div>

                <div>
                  <b>Termer att granska: </b>
                  {analysis.missing.join(', ') || 'Inga'}
                </div>
              </div>
            )}

            {/* REKRYTERARMEJL */}
            <h2>
              <Mail size={19} />
              Utkast till rekryterarmejl
            </h2>

            <p>
              Skapa ett professionellt mejlutkast
              efter att en jobbansökan verkligen
              har skickats. Inget mejl skickas
              automatiskt i denna version.
            </p>

            <label>
              Ditt namn
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Förnamn Efternamn"
              />
            </label>

            <button
              disabled={loading || name.trim().length < 2}
              onClick={makeDraft}
            >
              Skapa mejlutkast
            </button>

            {draft && (
              <div className="result">
                <strong>{draft.subject}</strong>
                <pre>{draft.body}</pre>
                <small>Status: Inte skickat</small>
              </div>
            )}
          </section>
        )}

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        <footer>
          AI Job Agent • CV-uppladdning v0.2 •
          Ingen automatisk ansökan eller
          mejlsändning ännu
        </footer>
      </main>
    </div>
  );
}

createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
