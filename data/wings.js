/* The museum registry: the single source of truth for what exists and in
   what order. The shelf, the walkbar, each room heading, the dosimeter and the
   URL are all derived from WINGS and BOOK_TITLES, so they cannot disagree. */

export const WINGS = [
  { id: 'atom',    n: 'Wing I',   name: 'The Atom',
    desc: 'What actually happens inside a nucleus, and why it releases so much.',
    rooms: ['fission', 'kinetics'] },
  { id: 'reactor', n: 'Wing II',  name: 'The Reactor',
    desc: 'How that heat becomes a plant, part by part, reactor to grid.',
    rooms: ['reactor-motion', 'how', 'build-one'] },
  { id: 'record',  n: 'Wing III', name: 'The Record',
    desc: 'The evidence: first whether it is dangerous, then whether it is useful.',
    rooms: ['data', 'incidents', 'exposure', 'capacity', 'costs', 'simulator', 'case'] },
  { id: 'frontier',n: 'Wing IV',  name: 'The Frontier',
    desc: 'Where the field is going, and the problems it has not solved.',
    rooms: ['limits', 'news'] },
  { id: 'reading', n: 'Wing V',   name: 'The Field',
    desc: 'Who works in nuclear, how to join them, and every source on these walls.',
    rooms: ['myths', 'careers', 'students', 'about'] }
];

export const BOOK_TITLES = {
  fission: 'Fission', kinetics: 'Control', 'reactor-motion': 'A Real Plant', how: 'Inside One',
  'build-one': 'Building One',
  data: 'Death Rates', capacity: 'Uptime', costs: 'Costs',
  incidents: 'Accidents', exposure: 'Radiation', simulator: 'Build a Grid',
  'case': 'The Case', limits: 'Problems', news: 'Right Now',
  myths: 'Myths', careers: 'Careers', students: 'Your Way In',
  about: 'Sources'
};

export const WING_CLOTH = {
  atom:     '#8A7550',   // ochre
  reactor:  '#7C6B45',   // tan
  record:   '#6E6653',   // olive
  frontier: '#5E6B63',   // slate green
  reading:  '#6B5A47'    // walnut
};

export const LOTS = [1, 0.82, 1.16, 0.9, 1.08, 0.76, 1.22];

export const CASTS = [0, 1, -1, -1, 1, 0, 1];

export const BOOK_MARKS = {
  fission:          '<circle cx="12" cy="12" r="8"/><path d="M12 4l-2.4 5.6 4.8 1.6-2.4 4.8"/>',
  kinetics:         '<path d="M3.4 20.4h17.2"/><path d="M4 16.6c3.4 0 3.4-9 6.8-9s3.4 9 6.8 9h2.6"/><path d="M8.4 3.6v5M12 3.6v5M15.6 3.6v5"/>',
  'reactor-motion': '<path d="M8 21V10L6 4h12l-2 6v11z"/><path d="M10 2.2c1.1-1 2.9-1 4 0"/>',
  how:              '<path d="M3.5 20.5h17"/><path d="M6 20.5V13a6 6 0 0 1 12 0v7.5"/><circle cx="12" cy="13.5" r="2"/>',
  data:             '<path d="M4 20.5V6M9.3 20.5v-8M14.7 20.5v-5M20 20.5v-2.4"/>',
  capacity:         '<circle cx="12" cy="12" r="8"/><path d="M12 7v5.4l3.2 2"/>',
  costs:            '<circle cx="12" cy="12" r="8"/><path d="M12 6.6v10.8"/><path d="M14.6 9.6c0-1.2-1.2-2.1-2.6-2.1s-2.6.9-2.6 2.1S10.6 11.8 12 11.8s2.6 1 2.6 2.2-1.2 2.1-2.6 2.1-2.6-.9-2.6-2.1"/>',
  incidents:        '<path d="M12 3.6L2.6 20.4h18.8z"/><path d="M12 10v4.2M12 17.4h.01"/>',
  exposure:         '<circle cx="12" cy="12" r="2.3"/><path d="M12 2.6a9.4 9.4 0 0 1 8.1 4.7l-4.1 2.4A4.7 4.7 0 0 0 12 7.3z"/><path d="M12 2.6a9.4 9.4 0 0 1 8.1 4.7l-4.1 2.4A4.7 4.7 0 0 0 12 7.3z" transform="rotate(120 12 12)"/><path d="M12 2.6a9.4 9.4 0 0 1 8.1 4.7l-4.1 2.4A4.7 4.7 0 0 0 12 7.3z" transform="rotate(240 12 12)"/>',
  simulator:        '<path d="M3.5 7h17M3.5 12h17M3.5 17h17"/><circle cx="9" cy="7" r="2.1"/><circle cx="15.5" cy="12" r="2.1"/><circle cx="7" cy="17" r="2.1"/>',
  'case':           '<path d="M12 5v14M7 19.5h10M3 9.2h18"/><path d="M3 9.2L1.4 12.8h3.2z"/><path d="M21 9.2l1.6 3.6h-3.2z"/>',
  limits:           '<path d="M13.5 2.8L9.6 9.4l4.2 1.9-3.4 4.2 3.6 1.8-2.4 4.1"/>',
  news:             '<circle cx="12" cy="12" r="2.1"/><path d="M7.9 7.9a6 6 0 0 0 0 8.2M16.1 7.9a6 6 0 0 1 0 8.2M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
  myths:            '<path d="M3.5 9h14l-3.4-3.4M20.5 15h-14l3.4 3.4"/>',
  careers:          '<path d="M2.8 17.6h18.4"/><path d="M5.2 17.6v-2.2a6.8 6.8 0 0 1 13.6 0v2.2"/><path d="M9.6 8.9V5.4h4.8v3.5"/>',
  students:         '<path d="M9.4 3.2h9.4v17.6H9.4"/><path d="M2.6 12h9.6M9 8.2l3.8 3.8L9 15.8"/>',
  about:            '<path d="M3 5.2h6.6a2.4 2.4 0 0 1 2.4 2.4v11.6a2.4 2.4 0 0 0-2.4-2.4H3z"/><path d="M21 5.2h-6.6A2.4 2.4 0 0 0 12 7.6v11.6a2.4 2.4 0 0 1 2.4-2.4H21z"/>'
};

export const OPERABLE = { simulator: 1, kinetics: 1, fission: 1 };
