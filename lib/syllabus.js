export const SYLLABUS = {
  // Biology
  'A1.1': 'Water', 'A1.2': 'Nucleic Acids',
  'B1.1': 'Carbohydrates & Lipids', 'B1.2': 'Proteins',
  'C1.1': 'Enzymes', 'C1.2': 'Cell Respiration', 'C1.3': 'Photosynthesis',
  'D1.1': 'DNA Replication', 'D1.2': 'Protein Synthesis', 'D1.3': 'Mutations & Gene Editing',
  'A2.1': 'Cell Structure', 'A2.2': 'Cell Membranes', 'A2.3': 'Viruses',
  'B2.1': 'Membrane Transport', 'B2.2': 'Cell Signaling',
  'C2.1': 'Chemical Signaling', 'C2.2': 'Neural Signaling',
  'D2.1': 'Cell Cycle', 'D2.2': 'Gene Expression', 'D2.3': 'Water Potential',
  'A3.1': 'Diversity of Organisms', 'A3.2': 'Classification & Cladistics',
  'B3.1': 'Gas Exchange', 'B3.2': 'Transport', 'B3.3': 'Muscle & Movement',
  'C3.1': 'Integration of Body Systems', 'C3.2': 'Defense Against Disease',
  'D3.1': 'Reproduction', 'D3.2': 'Inheritance', 'D3.3': 'Homeostasis',
  'A4.1': 'Evolution & Speciation', 'A4.2': 'Conservation',
  'B4.1': 'Adaptation to Environment', 'B4.2': 'Ecological Niches',
  'C4.1': 'Populations & Communities', 'C4.2': 'Energy & Matter Transfer',
  'D4.1': 'Natural Selection', 'D4.2': 'Sustainability & Change', 'D4.3': 'Climate Change',
  // Chemistry
  'S1.1': 'Intro & Atomic Structure', 'S1.2': 'Electron Configuration',
  'S1.3': 'Isotopes & Mass Spectrometry', 'S1.4': 'Counting Particles',
  'S1.5': 'Ideal Gases',
  'S2.1': 'Ionic Bonding', 'S2.2': 'Covalent Bonding', 'S2.3': 'Metallic Bonding',
  'S2.4': 'Molecular Geometry', 'S2.5': 'Intermolecular Forces',
  'S3.1': 'Periodicity', 'S3.2': 'Functional Groups',
  'R1.1': 'Measuring Enthalpy', 'R1.2': 'Energy Cycles', 'R1.3': 'Entropy & Spontaneity',
  'R1.4': 'Enthalpies of Reaction',
  'R2.1': 'Rate of Reaction', 'R2.2': 'Rate Expression',
  'R3.1': 'Proton Transfer', 'R3.2': 'Electron Transfer', 'R3.3': 'Electron Sharing',
  'R3.4': 'Electron Pair Sharing',
};

// Lookup with parent-code fallback (A4.1.1 → A4.1)
export function sylName(code) {
  if (SYLLABUS[code]) return SYLLABUS[code];
  const parent = code.replace(/\.\d+$/, '');
  if (parent !== code && SYLLABUS[parent]) return SYLLABUS[parent];
  return '';
}
