
import { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Printer,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

type TargetJob = {
  title: string;
  company: string;
};

type Props = {
  cvText: string;
  targetJob: TargetJob | null;
};

type Experience = {
  id: number;
  role: string;
  employer: string;
  period: string;
  details: string;
};

type Education = {
  id: number;
  degree: string;
  school: string;
  period: string;
  details: string;
};

type Project = {
  id: number;
  name: string;
  technologies: string;
  details: string;
};

type Profile = {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: string;
  summary: string;
  skills: string;
  languages: string;
  other: string;
  experiences: Experience[];
  educations: Education[];
  projects: Project[];
};

type BasicKey =
  | 'name'
  | 'title'
  | 'email'
  | 'phone'
  | 'location'
  | 'links'
  | 'summary'
  | 'skills'
  | 'languages'
  | 'other';

type SuggestionKind =
  | 'experience'
  | 'education'
  | 'project';

type Suggestion = {
  id: number;
  kind: SuggestionKind;
  text: string;
};

type SectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'languages'
  | 'other'
  | 'references';

let counter = 0;

function nextId(): number {
  counter += 1;
  return counter;
}

function emptyProfile(): Profile {
  return {
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    links: '',
    summary: '',
    skills: '',
    languages: '',
    other: '',
    experiences: [],
    educations: [],
    projects: [],
  };
}

function newExperience(): Experience {
  return {
    id: nextId(),
    role: '',
    employer: '',
    period: '',
    details: '',
  };
}

function newEducation(): Education {
  return {
    id: nextId(),
    degree: '',
    school: '',
    period: '',
    details: '',
  };
}

function newProject(): Project {
  return {
    id: nextId(),
    name: '',
    technologies: '',
    details: '',
  };
}

// Reparera vanliga teckenkodningsfel i importerad text.
function repairText(value: string): string {
  const replacements: Array<[string, string]> = [
    ['Ã¥', 'å'],
    ['Ã¤', 'ä'],
    ['Ã¶', 'ö'],
    ['Ã…', 'Å'],
    ['Ã„', 'Ä'],
    ['Ã–', 'Ö'],
    ['â€“', '–'],
    ['â€”', '—'],
    ['â€¢', '•'],
    ['â€¦', '…'],
    ['â€™', '’'],
    ['â€œ', '“'],
    ['â€\u009d', '”'],
    ['Â§', '§'],
    ['Â ', ' '],
  ];

  let result = value;

  for (const [wrong, correct] of replacements) {
    result = result.split(wrong).join(correct);
  }

  return result
    .replace(/\u0000/g, '')
    .replace(/[□■�]/g, '')
    .replace(/\r\n?/g, '\n');
}

function normalize(value: string): string {
  return repairText(value)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function compact(value: string): string {
  return normalize(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSection(value: string): string {
  return normalize(value)
    .replace(/\s*[•●]\s*/g, '\n• ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function extractEmail(value: string): string {
  return (
    value.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    )?.[0] ?? ''
  );
}

function extractPhone(value: string): string {
  return (
    value.match(
      /(?:\+46|0)(?:[\s-]?\d){7,11}/
    )?.[0]?.trim() ?? ''
  );
}

function extractName(value: string): string {
  const first = compact(value).slice(0, 100);

  return (
    first.match(
      /^([\p{Lu}][\p{L}'-]+\s+[\p{Lu}][\p{L}'-]+)/u
    )?.[1] ?? ''
  );
}

function extractLinks(value: string): string {
  const found =
    value.match(
      /(?:https?:\/\/)?(?:www\.)?(?:github\.com\/[\w-]+|linkedin\.com\/in\/[\w-]+)/gi
    ) ?? [];

  return [...new Set(found)].join('\n');
}

function extractLocation(value: string): string {
  const explicit = value.match(
    /(?:^|\s)(?:Ort|Location)\s*:\s*([\p{Lu}][\p{L}-]+)/iu
  );

  if (explicit) return explicit[1];

  // Endast efter en tydlig platsmarkör i CV-texten.
  const marked = value.match(
    /(?:[•*|]\s*)([\p{Lu}][\p{L}-]+)\s*(?:[|•]|\n)/u
  );

  return marked?.[1] ?? '';
}

const headings: Array<{
  key: SectionKey;
  names: string[];
}> = [
  {
    key: 'experience',
    names: ['Arbetslivserfarenhet'],
  },
  {
    key: 'education',
    names: ['Utbildning'],
  },
  {
    key: 'skills',
    names: [
      'Tekniska kunskaper',
      'Kompetenser',
    ],
  },
  {
    key: 'projects',
    names: ['Projekt'],
  },
  {
    key: 'languages',
    names: ['Språk'],
  },
  {
    key: 'other',
    names: ['Övrigt'],
  },
  {
    key: 'summary',
    names: ['Profil'],
  },
  {
    key: 'references',
    names: ['Referenser'],
  },
];

type Heading = {
  key: SectionKey;
  start: number;
  end: number;
};

// Identifiera avsnitt utan att använda \b för Å, Ä och Ö.
// Varje avsnitts första tydliga förekomst väljs.
function findSections(text: string): Heading[] {
  const found: Heading[] = [];

  for (const heading of headings) {
    for (const name of heading.names) {
      const pattern = new RegExp(
        `(^|\\s)(${name})(?=\\s|$)`,
        'giu'
      );

      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        if (match.index === undefined) continue;

        const position =
          match.index + match[1].length;

        const previous = text
          .slice(Math.max(0, position - 2), position)
          .trim();

        const following = text.slice(
          position + name.length,
          position + name.length + 80
        );

        // Undvik vanliga omnämnanden inne i en mening.
        const isLikelyHeading =
          position === 0 ||
          previous === '' ||
          match[2] === match[2].toUpperCase() ||
          /^[\s\n]*[A-ZÅÄÖ]/.test(following);

        if (!isLikelyHeading) continue;

        if (
          !found.some(
            item => item.key === heading.key
          )
        ) {
          found.push({
            key: heading.key,
            start: position,
            end: position + name.length,
          });
        }

        break;
      }
    }
  }

  return found.sort(
    (a, b) => a.start - b.start
  );
}

function readCV(text: string): {
  profile: Profile;
  suggestions: Suggestion[];
} {
  const source = compact(text);
  const profile = emptyProfile();
  const suggestions: Suggestion[] = [];

  if (!source) {
    return { profile, suggestions };
  }

  profile.name = extractName(source);
  profile.email = extractEmail(source);
  profile.phone = extractPhone(source);
  profile.links = extractLinks(source);
  profile.location = extractLocation(source);

  const sections = findSections(source);

  const firstSection =
    sections[0]?.start ?? source.length;

  let introduction = source
    .slice(0, firstSection)
    .trim();

  if (profile.name) {
    introduction = introduction
      .replace(profile.name, '')
      .trim();
  }

  const titleSplit = introduction.search(
    /Nyexaminerad|Erfarenhet av|Jag är/i
  );

  if (titleSplit > 0) {
    const potentialTitle =
      introduction.slice(0, titleSplit).trim();

    if (
      potentialTitle.length >= 3 &&
      potentialTitle.length <= 110
    ) {
      profile.title = potentialTitle;
      introduction = introduction
        .slice(titleSplit)
        .trim();
    }
  }

  // Ta bort tydliga kontaktuppgifter ur profiltexten.
  introduction = introduction
    .replace(profile.email, '')
    .replace(profile.phone, '')
    .replace(
      /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/gi,
      ''
    )
    .replace(
      /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/gi,
      ''
    )
    .replace(/LinkedIn-profil/gi, '')
    .replace(/[§#ï]/g, '')
    .trim();

  if (introduction.length > 25) {
    profile.summary = introduction;
  }

  const chunks: Record<SectionKey, string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    languages: [],
    other: [],
    references: [],
  };

  sections.forEach((heading, index) => {
    const next = sections[index + 1];

    const content = cleanSection(
      source.slice(
        heading.end,
        next?.start ?? source.length
      )
    );

    if (content.length > 2) {
      chunks[heading.key].push(content);
    }
  });

  const extraSummary =
    chunks.summary.join('\n\n').trim();

  if (extraSummary) {
    profile.summary = [
      profile.summary,
      extraSummary,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  const skillsText =
    chunks.skills.join('\n\n');

  // Vissa PDF:er placerar SPRÅK och ÖVRIGT
  // inne i kompetensavsnittet.
  const languageMatch = skillsText.match(
    /(?:^|\s)SPRÅK\s+([\s\S]*?)(?=\s+ÖVRIGT\b|$)/i
  );

  const otherMatch = skillsText.match(
    /(?:^|\s)ÖVRIGT\s+([\s\S]*)/i
  );

  profile.languages = [
    chunks.languages.join('\n'),
    languageMatch?.[1]?.trim() ?? '',
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  profile.other = [
    chunks.other.join('\n'),
    otherMatch?.[1]?.trim() ?? '',
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  profile.skills = skillsText
    .replace(
      /(?:^|\s)SPRÅK\s+[\s\S]*$/i,
      ''
    )
    .replace(
      /(?:^|\s)ÖVRIGT\s+[\s\S]*$/i,
      ''
    )
    .trim();

  const addSuggestion = (
    kind: SuggestionKind,
    content: string
  ) => {
    const cleaned = cleanSection(content)
      .replace(/^[.,;•\s]+|[.,;•\s]+$/g, '')
      .trim();

    if (cleaned.length < 15) return;

    const duplicate = suggestions.some(
      item =>
        item.kind === kind &&
        item.text === cleaned
    );

    if (!duplicate) {
      suggestions.push({
        id: nextId(),
        kind,
        text: cleaned,
      });
    }
  };

  chunks.experience.forEach(content =>
    addSuggestion('experience', content)
  );

  chunks.education.forEach(content =>
    addSuggestion('education', content)
  );

  chunks.projects.forEach(content =>
    addSuggestion('project', content)
  );

  return { profile, suggestions };
}

function detailsLines(value: string): string[] {
  return value
    .split('\n')
    .map(line =>
      line.replace(/^[\s•-]+/, '').trim()
    )
    .filter(Boolean);
}

export default function ResumeStudio({
  cvText,
  targetJob,
}: Props) {
  const [profile, setProfile] =
    useState<Profile>(
      () => readCV(cvText).profile
    );

  const [suggestions, setSuggestions] =
    useState<Suggestion[]>(
      () => readCV(cvText).suggestions
    );

  const [approved, setApproved] =
    useState(false);

  const [notice, setNotice] =
    useState('');

  useEffect(() => {
    const result = readCV(cvText);

    setProfile(result.profile);
    setSuggestions(result.suggestions);
    setApproved(false);
    setNotice('');
  }, [cvText]);

  if (!cvText.trim()) return null;

  function changeBasic(
    key: BasicKey,
    value: string
  ) {
    setProfile(previous => ({
      ...previous,
      [key]: value,
    }));

    setApproved(false);
  }

  function changeExperience(
    itemId: number,
    key: keyof Omit<Experience, 'id'>,
    value: string
  ) {
    setProfile(previous => ({
      ...previous,
      experiences: previous.experiences.map(item =>
        item.id === itemId
          ? { ...item, [key]: value }
          : item
      ),
    }));

    setApproved(false);
  }

  function changeEducation(
    itemId: number,
    key: keyof Omit<Education, 'id'>,
    value: string
  ) {
    setProfile(previous => ({
      ...previous,
      educations: previous.educations.map(item =>
        item.id === itemId
          ? { ...item, [key]: value }
          : item
      ),
    }));

    setApproved(false);
  }

  function changeProject(
    itemId: number,
    key: keyof Omit<Project, 'id'>,
    value: string
  ) {
    setProfile(previous => ({
      ...previous,
      projects: previous.projects.map(item =>
        item.id === itemId
          ? { ...item, [key]: value }
          : item
      ),
    }));

    setApproved(false);
  }

  function addExperience() {
    setProfile(previous => ({
      ...previous,
      experiences: [
        ...previous.experiences,
        newExperience(),
      ],
    }));

    setApproved(false);
  }

  function addEducation() {
    setProfile(previous => ({
      ...previous,
      educations: [
        ...previous.educations,
        newEducation(),
      ],
    }));

    setApproved(false);
  }

  function addProject() {
    setProfile(previous => ({
      ...previous,
      projects: [
        ...previous.projects,
        newProject(),
      ],
    }));

    setApproved(false);
  }

  function removeExperience(itemId: number) {
    setProfile(previous => ({
      ...previous,
      experiences: previous.experiences.filter(
        item => item.id !== itemId
      ),
    }));

    setApproved(false);
  }

  function removeEducation(itemId: number) {
    setProfile(previous => ({
      ...previous,
      educations: previous.educations.filter(
        item => item.id !== itemId
      ),
    }));

    setApproved(false);
  }

  function removeProject(itemId: number) {
    setProfile(previous => ({
      ...previous,
      projects: previous.projects.filter(
        item => item.id !== itemId
      ),
    }));

    setApproved(false);
  }

  function acceptSuggestion(
    suggestion: Suggestion
  ) {
    if (suggestion.kind === 'experience') {
      setProfile(previous => ({
        ...previous,
        experiences: [
          ...previous.experiences,
          {
            ...newExperience(),
            details: suggestion.text,
          },
        ],
      }));
    }

    if (suggestion.kind === 'education') {
      setProfile(previous => ({
        ...previous,
        educations: [
          ...previous.educations,
          {
            ...newEducation(),
            details: suggestion.text,
          },
        ],
      }));
    }

    if (suggestion.kind === 'project') {
      setProfile(previous => ({
        ...previous,
        projects: [
          ...previous.projects,
          {
            ...newProject(),
            details: suggestion.text,
          },
        ],
      }));
    }

    setSuggestions(previous =>
      previous.filter(
        item => item.id !== suggestion.id
      )
    );

    setApproved(false);

    setNotice(
      'Förslaget har lagts till. ' +
      'Kontrollera informationen och fyll i ' +
      'de saknade fälten.'
    );
  }

  function rejectSuggestion(itemId: number) {
    setSuggestions(previous =>
      previous.filter(
        item => item.id !== itemId
      )
    );
  }

  function restoreCV() {
    const result = readCV(cvText);

    setProfile(result.profile);
    setSuggestions(result.suggestions);
    setApproved(false);

    setNotice(
      'CV-informationen har lästs in på nytt. ' +
      'Tidigare manuella ändringar har återställts.'
    );
  }

  function savePDF() {
    if (!profile.name.trim() || !approved) {
      setNotice(
        'Ange ditt namn och bekräfta ' +
        'att uppgifterna är korrekta.'
      );
      return;
    }

    window.print();
  }

  function textField(
    title: string,
    value: string,
    onChange: (value: string) => void,
    multiline = false
  ) {
    return (
      <label
        className={
          multiline ? 'resume-wide' : undefined
        }
      >
        {title}

        {multiline ? (
          <textarea
            rows={4}
            value={value}
            onChange={event =>
              onChange(event.target.value)
            }
          />
        ) : (
          <input
            value={value}
            onChange={event =>
              onChange(event.target.value)
            }
          />
        )}
      </label>
    );
  }

  return (
    <section className="card resume-studio">
      <h2>
        <FileText size={20} />
        CV Studio – v0.6.1
      </h2>

      <p>
        Ladda upp ditt CV, granska automatiska
        förslag och skapa en strukturerad CV-profil.
        Inga uppgifter skickas till en AI-tjänst.
      </p>

      <div className="resume-notice">
        <AlertCircle size={17} />
        <span>
          Automatiska förslag är inte verifierade.
          PDF-filer med flera kolumner kan
          fortfarande innehålla felaktig textordning.
        </span>
      </div>

      {targetJob && (
        <div className="resume-target">
          <strong>Vald tjänst:</strong>{' '}
          {targetJob.title} hos{' '}
          {targetJob.company}.

          <p>
            Automatisk CV-anpassning till jobbet
            är ännu inte aktiverad.
          </p>
        </div>
      )}

      <h2>1. Automatiska förslag</h2>

      {suggestions.length === 0 ? (
        <p>
          Inga ytterligare förslag hittades.
          Du kan lägga till uppgifter manuellt.
        </p>
      ) : (
        suggestions.map(suggestion => (
          <div
            className="result"
            key={suggestion.id}
          >
            <h3>
              {suggestion.kind === 'experience'
                ? 'Möjlig arbetslivserfarenhet'
                : suggestion.kind === 'education'
                ? 'Möjlig utbildning'
                : 'Möjligt projekt'}
            </h3>

            <p>
              {suggestion.text.slice(0, 1500)}
              {suggestion.text.length > 1500
                ? '…'
                : ''}
            </p>

            <div className="resume-actions">
              <button
                type="button"
                onClick={() =>
                  acceptSuggestion(suggestion)
                }
              >
                <Plus size={16} />
                Använd förslag
              </button>

              <button
                type="button"
                onClick={() =>
                  rejectSuggestion(suggestion.id)
                }
              >
                Avvisa
              </button>
            </div>
          </div>
        ))
      )}

      <h2>2. Personliga uppgifter</h2>

      <div className="resume-editor">
        {textField(
          'Fullständigt namn',
          profile.name,
          value =>
            changeBasic('name', value)
        )}

        {textField(
          'Yrkestitel',
          profile.title,
          value =>
            changeBasic('title', value)
        )}

        {textField(
          'E-postadress',
          profile.email,
          value =>
            changeBasic('email', value)
        )}

        {textField(
          'Telefonnummer',
          profile.phone,
          value =>
            changeBasic('phone', value)
        )}

        {textField(
          'Ort',
          profile.location,
          value =>
            changeBasic('location', value)
        )}

        {textField(
          'GitHub och LinkedIn',
          profile.links,
          value =>
            changeBasic('links', value),
          true
        )}

        {textField(
          'Profiltext',
          profile.summary,
          value =>
            changeBasic('summary', value),
          true
        )}
      </div>

      <h2>3. Arbetslivserfarenhet</h2>

      {profile.experiences.map((item, index) => (
        <div className="result" key={item.id}>
          <h3>Arbete {index + 1}</h3>

          <div className="resume-editor">
            {textField(
              'Yrkestitel',
              item.role,
              value =>
                changeExperience(
                  item.id,
                  'role',
                  value
                )
            )}

            {textField(
              'Arbetsgivare',
              item.employer,
              value =>
                changeExperience(
                  item.id,
                  'employer',
                  value
                )
            )}

            {textField(
              'Period',
              item.period,
              value =>
                changeExperience(
                  item.id,
                  'period',
                  value
                )
            )}

            {textField(
              'Arbetsuppgifter',
              item.details,
              value =>
                changeExperience(
                  item.id,
                  'details',
                  value
                ),
              true
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              removeExperience(item.id)
            }
          >
            <Trash2 size={16} />
            Ta bort arbete
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addExperience}
      >
        <Plus size={16} />
        Lägg till arbete
      </button>

      <h2>4. Utbildning</h2>

      {profile.educations.map((item, index) => (
        <div className="result" key={item.id}>
          <h3>Utbildning {index + 1}</h3>

          <div className="resume-editor">
            {textField(
              'Utbildning eller examen',
              item.degree,
              value =>
                changeEducation(
                  item.id,
                  'degree',
                  value
                )
            )}

            {textField(
              'Skola eller universitet',
              item.school,
              value =>
                changeEducation(
                  item.id,
                  'school',
                  value
                )
            )}

            {textField(
              'Period',
              item.period,
              value =>
                changeEducation(
                  item.id,
                  'period',
                  value
                )
            )}

            {textField(
              'Beskrivning',
              item.details,
              value =>
                changeEducation(
                  item.id,
                  'details',
                  value
                ),
              true
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              removeEducation(item.id)
            }
          >
            <Trash2 size={16} />
            Ta bort utbildning
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addEducation}
      >
        <Plus size={16} />
        Lägg till utbildning
      </button>

      <h2>5. Kompetenser och språk</h2>

      <div className="resume-editor">
        {textField(
          'Kompetenser',
          profile.skills,
          value =>
            changeBasic('skills', value),
          true
        )}

        {textField(
          'Språk',
          profile.languages,
          value =>
            changeBasic('languages', value),
          true
        )}

        {textField(
          'Övrigt',
          profile.other,
          value =>
            changeBasic('other', value),
          true
        )}
      </div>

      <h2>6. Projekt</h2>

      {profile.projects.map((item, index) => (
        <div className="result" key={item.id}>
          <h3>Projekt {index + 1}</h3>

          <div className="resume-editor">
            {textField(
              'Projektnamn',
              item.name,
              value =>
                changeProject(
                  item.id,
                  'name',
                  value
                )
            )}

            {textField(
              'Tekniker och verktyg',
              item.technologies,
              value =>
                changeProject(
                  item.id,
                  'technologies',
                  value
                )
            )}

            {textField(
              'Projektbeskrivning',
              item.details,
              value =>
                changeProject(
                  item.id,
                  'details',
                  value
                ),
              true
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              removeProject(item.id)
            }
          >
            <Trash2 size={16} />
            Ta bort projekt
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addProject}
      >
        <Plus size={16} />
        Lägg till projekt
      </button>

      <h2>7. Granska och exportera</h2>

      <label
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <input
          type="checkbox"
          style={{ width: 'auto' }}
          checked={approved}
          onChange={event =>
            setApproved(event.target.checked)
          }
        />

        Jag har granskat alla uppgifter och
        kontrollerat att de är korrekta.
      </label>

      <div className="resume-actions">
        <button
          type="button"
          disabled={
            !approved || !profile.name.trim()
          }
          onClick={savePDF}
        >
          <Printer size={17} />
          Spara som PDF
        </button>

        <button
          type="button"
          onClick={restoreCV}
        >
          <RotateCcw size={16} />
          Läs in CV på nytt
        </button>
      </div>

      {notice && (
        <p className="resume-notice" role="status">
          <CheckCircle2 size={16} />
          {notice}
        </p>
      )}

      <h2>Förhandsvisning</h2>

      <article className="resume-print">
        <h1>
          {profile.name || 'Ditt namn'}
        </h1>

        {profile.title && (
          <p className="resume-job-title">
            {profile.title}
          </p>
        )}

        <p className="resume-contact">
          {[
            profile.email,
            profile.phone,
            profile.location,
            profile.links,
          ]
            .filter(Boolean)
            .join('\n')}
        </p>

        {profile.summary.trim() && (
          <div className="resume-section">
            <h2>Profil</h2>
            <p>{profile.summary}</p>
          </div>
        )}

        {profile.experiences.some(
          item =>
            item.role.trim() ||
            item.employer.trim()
        ) && (
          <div className="resume-section">
            <h2>Arbetslivserfarenhet</h2>

            {profile.experiences
              .filter(
                item =>
                  item.role.trim() ||
                  item.employer.trim()
              )
              .map(item => (
                <div
                  key={item.id}
                  style={{ marginBottom: 16 }}
                >
                  <strong>
                    {[
                      item.role,
                      item.employer,
                    ]
                      .filter(Boolean)
                      .join(' – ')}
                  </strong>

                  {item.period && (
                    <p>{item.period}</p>
                  )}

                  {detailsLines(
                    item.details
                  ).map((line, index) => (
                    <p key={index}>
                      • {line}
                    </p>
                  ))}
                </div>
              ))}
          </div>
        )}

        {profile.educations.some(
          item =>
            item.degree.trim() ||
            item.school.trim()
        ) && (
          <div className="resume-section">
            <h2>Utbildning</h2>

            {profile.educations
              .filter(
                item =>
                  item.degree.trim() ||
                  item.school.trim()
              )
              .map(item => (
                <div
                  key={item.id}
                  style={{ marginBottom: 16 }}
                >
                  <strong>
                    {[
                      item.degree,
                      item.school,
                    ]
                      .filter(Boolean)
                      .join(' – ')}
                  </strong>

                  {item.period && (
                    <p>{item.period}</p>
                  )}

                  {item.details && (
                    <p>{item.details}</p>
                  )}
                </div>
              ))}
          </div>
        )}

        {profile.skills.trim() && (
          <div className="resume-section">
            <h2>Kompetenser</h2>
            <p>{profile.skills}</p>
          </div>
        )}

        {profile.projects.some(
          item => item.name.trim()
        ) && (
          <div className="resume-section">
            <h2>Projekt</h2>

            {profile.projects
              .filter(item => item.name.trim())
              .map(item => (
                <div
                  key={item.id}
                  style={{ marginBottom: 16 }}
                >
                  <strong>{item.name}</strong>

                  {item.technologies && (
                    <p>{item.technologies}</p>
                  )}

                  {item.details && (
                    <p>{item.details}</p>
                  )}
                </div>
              ))}
          </div>
        )}

        {profile.languages.trim() && (
          <div className="resume-section">
            <h2>Språk</h2>
            <p>{profile.languages}</p>
          </div>
        )}

        {profile.other.trim() && (
          <div className="resume-section">
            <h2>Övrigt</h2>
            <p>{profile.other}</p>
          </div>
        )}
      </article>

      <p className="resume-warning">
        CV Studio v0.6.1 använder regelbaserad
        dokumenttolkning. Användaren ansvarar
        för att kontrollera informationen.
        Ingen automatisk ansökan eller e-post
        skickas.
      </p>
    </section>
  );
}
