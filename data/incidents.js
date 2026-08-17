/* The three severe accidents, as feared against as found. Death tolls are
   separated into confirmed, modelled and non-radiological on purpose. */

export const INCIDENTS = [
  {
    year: 1979, name: 'Three Mile Island', location: 'Pennsylvania, USA', severity: 'INES Level 5',
    description: 'Partial meltdown of a pressurized-water reactor core. The containment structure did its job and prevented significant radiation release.',
    feared: 'Thousands feared', confirmed: '0', dose: 'Average dose to nearby residents: about 0.01 mSv, roughly a tenth of a chest X-ray (NRC)',
    happened: [
      'Equipment malfunction and operator confusion led to a partial core meltdown',
      'The containment building successfully prevented radiation release',
      'A small amount of gas was vented, with less exposure than a chest X-ray'
    ],
    longterm: [
      'Zero confirmed deaths or injuries from radiation',
      'Long-term studies found no increase in cancer rates',
      'Led to major improvements in operator training and control-room design'
    ]
  },
  {
    year: 1986, name: 'Chernobyl', location: 'Ukraine, USSR', severity: 'INES Level 7',
    description: 'Steam explosion and fire at a flawed Soviet RBMK reactor during a mishandled safety test. The worst nuclear accident in history.',
    feared: 'Hundreds of thousands', confirmed: '31 direct', dose: 'The Chernobyl Forum (WHO/IAEA) projected up to ~4,000 eventual deaths among the most-exposed groups',
    happened: [
      'A safety test was run with critical safety systems disabled',
      'The RBMK design flaw made the reactor unstable at low power',
      'No containment structure existed; the design was never used in the West'
    ],
    longterm: [
      '31 direct deaths among workers and firefighters; up to ~4,000 eventual deaths projected by the WHO/IAEA Chernobyl Forum',
      'Most evacuees received doses in the medical X-ray range',
      'RBMK reactors were phased out or heavily modified worldwide'
    ]
  },
  {
    year: 2011, name: 'Fukushima Daiichi', location: 'Japan', severity: 'INES Level 7',
    description: 'A magnitude-9.1 earthquake and 15-meter tsunami flooded backup generators at six boiling-water reactors, disabling cooling.',
    feared: 'Thousands', confirmed: '0 from radiation', dose: 'Most evacuees received less radiation than a CT scan',
    happened: [
      'Reactors shut down automatically and safely when the earthquake hit',
      'The tsunami overwhelmed the seawall and flooded backup power',
      'Hydrogen explosions damaged buildings, not the containment vessels'
    ],
    longterm: [
      'Zero confirmed deaths from radiation exposure (UNSCEAR)',
      '~2,300 deaths attributed to evacuation stress, mostly among the elderly; the evacuation itself was the greater harm',
      'Passive cooling systems are now standard in new designs'
    ]
  }
];
