/**
 * Deterministic local NER — the fallback "brain" when Chrome's built-in
 * Gemini Nano is unavailable. Rule-based, zero network, ~1ms on typical input.
 *
 * It intentionally favours recall for names / orgs / codenames, which regexes
 * alone cannot find. Combined with the regex safety net it powers the full
 * demo in any browser.
 */
import type { Detection, RedactionPolicy } from './types';

// Compact list of common given names — enough to catch "Firstname Lastname" in prose.
const FIRST_NAMES = new Set(
  (
    'James John Robert Michael William David Richard Joseph Thomas Charles Christopher Daniel Matthew Anthony Mark ' +
    'Donald Steven Paul Andrew Joshua Kenneth Kevin Brian George Timothy Ronald Edward Jason Jeffrey Ryan Jacob Gary ' +
    'Nicholas Eric Jonathan Stephen Larry Justin Scott Brandon Benjamin Samuel Gregory Alexander Frank Patrick Raymond ' +
    'Jack Dennis Jerry Tyler Aaron Jose Adam Nathan Henry Douglas Zachary Peter Kyle Noah Ethan Jeremy Walter Christian ' +
    'Keith Roger Terry Austin Sean Gerald Carl Harold Dylan Arthur Lawrence Jordan Jesse Bryan Billy Bruce Gabriel Joe ' +
    'Logan Alan Juan Albert Willie Elijah Wayne Randy Vincent Mason Roy Ralph Bobby Russell Bradley Philip Eugene Liam ' +
    'Mary Patricia Jennifer Linda Elizabeth Barbara Susan Jessica Sarah Karen Lisa Nancy Betty Sandra Margaret Ashley ' +
    'Kimberly Emily Donna Michelle Carol Amanda Melissa Deborah Stephanie Dorothy Rebecca Sharon Laura Cynthia Amy ' +
    'Kathleen Angela Shirley Brenda Emma Anna Pamela Nicole Samantha Katherine Christine Helen Debra Rachel Carolyn ' +
    'Janet Maria Catherine Heather Diane Olivia Julie Joyce Victoria Ruth Virginia Lauren Kelly Christina Joan Evelyn ' +
    'Judith Andrea Hannah Megan Cheryl Jacqueline Martha Madison Teresa Gloria Sara Janice Ann Kathryn Abigail Sophia ' +
    'Frances Jean Alice Judy Isabella Julia Grace Amber Denise Danielle Marilyn Beverly Charlotte Natalie Theresa Diana ' +
    'Priya Raj Arjun Aisha Wei Mei Hiroshi Yuki Kenji Sofia Lucas Mateo Diego Carlos Elena Ivan Dmitri Olga Fatima ' +
    'Omar Ahmed Mohammed Ali Hassan Leila Chen Li Jin Min Soo Anil Ravi Sanjay Deepak Ananya Rohan Vikram Neha Aditi ' +
    'Marcus Eleanor Harrison Vivian Theodore Clara Felix Iris Hugo Nora Oscar Ruby Silas Hazel Miles Stella Elliot ' +
    'Margot Desmond Celeste Reginald Beatrice Malcolm Genevieve Julian Adrienne Damon Serena Tobias Delphine Gideon'
  ).split(/\s+/),
);

const NAME_WORD = "[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?";
// Name sequences use single spaces only, so "Dr. Marcus Okafor    Phone:" stops at the name.
const NAME_SEQ_2 = `(?:${NAME_WORD})(?: [A-Z]\\.)?(?: ${NAME_WORD}){1,2}`;

const HONORIFIC = new RegExp(
  `\\b(?:Dr|Mr|Mrs|Ms|Mx|Prof|Judge|Hon)\\.? ((?:${NAME_WORD})(?: [A-Z]\\.)?(?: ${NAME_WORD}){0,2})`,
  'g',
);
const LABELED = new RegExp(
  `\\b(?:Patient(?: Name)?|Name|Attending(?: Physician)?|Physician|Provider|Referring|Guardian|Emergency Contact|Signed|Signatory|Author|Employee|Client|Contact|Prepared by|Reviewed by|Counsel|Nurse|Owner|Assignee|Reporter)[ \\t]*[:\\-–][ \\t]*(${NAME_SEQ_2})`,
  'g',
);
const ROLE_BEFORE = new RegExp(
  `\\b(?:CEO|CFO|CTO|COO|CISO|CMO|General Counsel|Chairman|Chairwoman|Chair|President|Founder|Co-founder|VP|SVP|EVP|Director|Partner|Managing Director) (?:of [A-Z][\\w&]+ )?((?:${NAME_WORD})(?: ${NAME_WORD}){1,2})`,
  'g',
);
const ROLE_AFTER = new RegExp(
  `\\b(${NAME_SEQ_2}), (?:the )?(?:CEO|CFO|CTO|COO|CISO|General Counsel|Chairman|President|Founder|VP|Director|Partner|MD|M\\.D\\.|RN|Esq\\.?)\\b`,
  'g',
);
const GIVEN_SURNAME = new RegExp(`\\b(${NAME_WORD}) ((?:[A-Z]\\. )?${NAME_WORD})\\b`, 'g');

const ORG_SUFFIX =
  '(?:Inc\\.?|Incorporated|Corp\\.?|Corporation|LLC|L\\.L\\.C\\.|Ltd\\.?|LLP|PLC|GmbH|AG|S\\.A\\.|Holdings|Capital|Partners|Ventures|Technologies|Systems|Group|Bank|Pharmaceuticals|Pharma|Biosciences|Therapeutics|Labs|Industries|Health|Hospital|Medical Center|Clinic|Dynamics|Networks|Logistics)';
const ORG = new RegExp(`\\b((?:[A-Z][A-Za-z0-9&.-]* ){0,3}[A-Z][A-Za-z0-9&-]* ${ORG_SUFFIX})(?![A-Za-z])`, 'g');
const CODENAME =
  /\b(?:Project|PROJECT|Operation|OPERATION|Codename|Code-name|Code name|Initiative|Program) ["“']?([A-Z][A-Za-z0-9-]{2,}(?: [A-Z][A-Za-z0-9-]{2,})?)["”']?/g;

const STOP_LEADING = /^(?:The|A|An|And|Or|Of|For|With|By|To|In|On|At|Between|This|That|Our|Their|Its|Each|Both|Whereas)\s+/;
const NOT_A_NAME = new Set([
  'The', 'This', 'That', 'Patient', 'Name', 'Date', 'Discharge', 'Summary', 'Agreement', 'Section', 'Article',
  'Hospital', 'Medical', 'Center', 'Street', 'Avenue', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
  'Saturday', 'Sunday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'Python', 'Node', 'Error', 'Exception', 'Traceback', 'File', 'Line',
  'Phone', 'Email', 'Address', 'Insurance', 'Member', 'Parent', 'Company', 'Board', 'Termination', 'Fee',
]);

function push(out: Detection[], matchIndex: number, full: string, value: string, type: Detection['type']) {
  const rel = full.indexOf(value);
  if (rel < 0) return;
  const start = matchIndex + rel;
  out.push({ start, end: start + value.length, value, type, source: 'ner' });
}

function looksLikeName(candidate: string): boolean {
  const words = candidate.split(/\s+/).filter((w) => !/^[A-Z]\.$/.test(w));
  return words.length >= 1 && words.every((w) => !NOT_A_NAME.has(w));
}

export function nerDetect(text: string, policy: RedactionPolicy): Detection[] {
  const out: Detection[] = [];

  if (policy.categories.PII) {
    for (const re of [HONORIFIC, LABELED, ROLE_BEFORE, ROLE_AFTER]) {
      for (const m of text.matchAll(re)) {
        const v = m[1].trim();
        if (looksLikeName(v)) push(out, m.index ?? 0, m[0], v, 'PERSON');
      }
    }
    for (const m of text.matchAll(GIVEN_SURNAME)) {
      const [full, first, last] = m;
      if (FIRST_NAMES.has(first) && looksLikeName(last)) push(out, m.index ?? 0, full, full, 'PERSON');
    }
  }

  if (policy.categories.CORPORATE) {
    for (const m of text.matchAll(ORG)) {
      const v = m[1].replace(STOP_LEADING, '').replace(STOP_LEADING, '').trim();
      if (v.split(/\s+/).length >= 2) push(out, m.index ?? 0, m[0], v, 'ORG');
    }
    for (const m of text.matchAll(CODENAME)) {
      const v = m[0].replace(/["“”']/g, '').trim();
      push(out, m.index ?? 0, m[0], v, 'CODENAME');
    }
  }

  return out;
}
