import { MoradabadDivision } from '../types/chess';

export interface MoradabadDirectoryEntry {
  name: string;
  area: string;
  category: string;
}

export const MORADABAD_SCHOOLS_LIST: MoradabadDirectoryEntry[] = [
  { name: 'Delhi Public School (DPS) Moradabad', area: 'Kanth Road / Lodhipur', category: 'CBSE' },
  { name: 'Springfields College Moradabad', area: 'Civil Lines', category: 'ICSE / ISC' },
  { name: 'K.C.M. School Moradabad', area: 'Ram Ganga Vihar', category: 'CBSE' },
  { name: "Wilsonia Scholars' Home", area: 'Civil Lines', category: 'ICSE / ISC' },
  { name: 'St. Mary’s Convent Senior Secondary School', area: 'Buddhi Vihar / Civil Lines', category: 'CBSE' },
  { name: 'St. Paul’s College Moradabad', area: 'Civil Lines', category: 'ICSE / ISC' },
  { name: 'G.D. Goenka Public School Moradabad', area: 'Delhi Road / Kanth Road', category: 'CBSE' },
  { name: 'Aryans International School Moradabad', area: 'Kanth Road', category: 'CBSE' },
  { name: 'P.M.S. Public School Moradabad', area: 'Civil Lines / Kanth Road', category: 'CBSE' },
  { name: 'Modern Public School Moradabad', area: 'Civil Lines', category: 'CBSE' },
  { name: 'R.S.D. Academy Public School', area: 'Ram Ganga Vihar', category: 'CBSE' },
  { name: 'Gandhi Nagar Public School', area: 'Gandhi Nagar', category: 'CBSE' },
  { name: 'S.S. Children Academy Moradabad', area: 'Kanth Road', category: 'CBSE' },
  { name: 'Shirdi Sai Public School Moradabad', area: 'Sai Vihar / Kanth Road', category: 'CBSE' },
  { name: 'Dewan Public School Moradabad', area: 'Ram Ganga Vihar', category: 'CBSE' },
  { name: 'Sanskar International School', area: 'Delhi Road', category: 'CBSE' },
  { name: 'Green Meadows School Moradabad', area: 'Ram Ganga Vihar', category: 'CBSE' },
  { name: 'Tiny Tots College Moradabad', area: 'Civil Lines', category: 'ICSE' },
  { name: 'Kendriya Vidyalaya Moradabad', area: 'Railway Colony', category: 'CBSE' },
  { name: 'Jawahar Navodaya Vidyalaya Moradabad', area: 'Kanth / Thakurdwara Rd', category: 'CBSE' },
  { name: 'Methodist Girls Inter College', area: 'Civil Lines', category: 'UP Board' },
  { name: 'Parker Inter College Moradabad', area: 'Civil Lines', category: 'UP Board' },
  { name: 'Chitragupt Inter College Moradabad', area: 'Station Road', category: 'UP Board' },
  { name: 'S.S.K. Inter College Moradabad', area: 'Katghar', category: 'UP Board' },
  { name: 'R.N. Inter College Moradabad', area: 'Station Road', category: 'UP Board' },
  { name: 'Maharaj Agrasen Public School', area: 'Ashiyana Colony', category: 'CBSE' },
  { name: 'Silver Bells Public School', area: 'Kanth Road', category: 'CBSE' },
  { name: 'Police Modern School Moradabad', area: 'Dr. B.R. Ambedkar Academy', category: 'CBSE' },
];

export const MORADABAD_COLLEGES_LIST: MoradabadDirectoryEntry[] = [
  { name: 'Teerthanker Mahaveer University (TMU)', area: 'Delhi Road, NH-9', category: 'University' },
  { name: 'Moradabad Institute of Technology (MIT)', area: 'Ram Ganga Vihar Phase-II', category: 'Engineering & Mgmt' },
  { name: 'IFTM University Moradabad', area: 'Lodhipur Rajput, Delhi Rd', category: 'University' },
  { name: 'Hindu College Moradabad', area: 'Station Road / Civil Lines', category: 'PG & Degree' },
  { name: 'K.G.K. (Kedar Nath Girdharilal Khatri) PG College', area: 'Civil Lines', category: 'PG & Law' },
  { name: 'Gokul Das Hindu Girls’ College', area: 'Station Road', category: 'Degree College' },
  { name: 'Dayanand Arya Kanya Degree College', area: 'Mandi Chowk / Civil Lines', category: 'Degree College' },
  { name: 'Maharaja Agrasen Mahavidyalaya', area: 'Kanth Road', category: 'Degree & Commerce' },
  { name: 'R.S.D. Academy (College & Institute)', area: 'Ram Ganga Vihar', category: 'Mgmt & Education' },
  { name: 'Government Polytechnic Moradabad', area: 'Kanth Road', category: 'Technical / Diploma' },
  { name: 'Radha Govind Institute of Technology', area: 'Chandausi / Moradabad Rd', category: 'Engineering' },
  { name: 'Moradabad Muslim Degree College', area: 'Peerzada / Karula', category: 'Degree College' },
  { name: 'Wilsonia Degree College Moradabad', area: 'Civil Lines', category: 'Degree & B.Ed' },
  { name: 'Teerthanker Mahaveer Medical College', area: 'Bagadpur, Delhi Rd', category: 'Medical' },
  { name: 'Kothiwal Dental College & Research Centre', area: 'Kanth Road, Mora Mustakem', category: 'Dental & Medical' },
  { name: 'Kothiwal Institute of Technology & Professional Studies', area: 'Kanth Road', category: 'Professional' },
  { name: 'Apex Institute of Management & Technology', area: 'Delhi Road', category: 'Management' },
  { name: 'Institute of Management & Technology (IMT) Moradabad', area: 'Ram Ganga Vihar', category: 'Management' },
  { name: 'Vardhman Institute of Education', area: 'Delhi Road', category: 'Education' },
  { name: 'Dr. Bhimrao Ambedkar Police Academy', area: 'Civil Lines', category: 'Academy' },
  { name: 'Sri Sai Institute of Nursing & Paramedical', area: 'Kanth Road', category: 'Nursing' },
  { name: 'S.V.M. Yoga & Health Sciences College', area: 'Civil Lines', category: 'Health Sciences' },
  { name: 'Government Women’s Polytechnic Moradabad', area: 'Kanth Road', category: 'Technical' },
  { name: 'R.N. College of Education & Tech', area: 'Sambhal Road', category: 'Education' },
];

export const MORADABAD_COMPANIES_LIST: MoradabadDirectoryEntry[] = [
  { name: 'C.L. Gupta Exports Ltd.', area: 'Delhi Road / Jivai', category: 'Brass & Glass Exports' },
  { name: 'DesignCo (D.D. International)', area: 'Lakri Fazalpur / Delhi Rd', category: 'Homeware & Metal Exports' },
  { name: 'Paramount Export House Moradabad', area: 'Prince Road / SEZ', category: 'Handicraft Exports' },
  { name: 'Hindustan Mint & Agro Products Pvt. Ltd.', area: 'Chandausi Road', category: 'Agro & Mint Manufacturing' },
  { name: 'Genus Paper & Boards Ltd.', area: 'Kanth Road, Aghwanpur', category: 'Paper & Industrial' },
  { name: 'Stalwart Exports Moradabad', area: 'Moradabad SEZ', category: 'Metal & Decor Exports' },
  { name: 'Walia Exports Moradabad', area: 'Lakri Fazalpur', category: 'Handicrafts & Brassware' },
  { name: 'Gauri Exports Moradabad', area: 'Delhi Road', category: 'Artware & Lighting Exports' },
  { name: 'Modi Exports Moradabad', area: 'Kanth Road', category: 'Export House' },
  { name: 'Lochan Brass & Handicrafts Pvt. Ltd.', area: 'Peetal Nagri / Galshaheed', category: 'Brassware Mfg' },
  { name: 'R.K. Handicrafts & Brassware Pvt. Ltd.', area: 'Industrial Area, Rampur Rd', category: 'Handicraft Manufacturing' },
  { name: 'Nawab Exports Moradabad', area: 'Eidgah / Rampur Road', category: 'Metalcraft Exports' },
  { name: 'Moradabad Special Economic Zone (MSEZ) Assoc.', area: 'Pakbara, Delhi Road', category: 'Industrial SEZ' },
  { name: 'Northern Railway — Moradabad DRM Division', area: 'Station Road', category: 'Railways & Logistics' },
  { name: 'Prathama UP Gramin Bank (Head Office)', area: 'Ram Ganga Vihar', category: 'Banking & Finance' },
  { name: 'State Bank of India Regional Office Moradabad', area: 'Civil Lines', category: 'Banking & Finance' },
  { name: 'UPPCL Moradabad Electricity Division', area: 'Buddhi Vihar / Civil Lines', category: 'Power & Utilities' },
  { name: 'Cosmos Hospital & Healthcare Moradabad', area: 'Kanth Road', category: 'Healthcare' },
  { name: 'Ujala Cygnus Brightstar Hospital', area: 'Ram Ganga Vihar', category: 'Healthcare' },
  { name: 'Apex Hospital & Trauma Centre Moradabad', area: 'Delhi Road', category: 'Healthcare' },
  { name: 'Wave Mall & Commercial Hub Moradabad', area: 'Ram Ganga Vihar', category: 'Retail & Hospitality' },
  { name: 'Holiday Regency / Clarks Inn Moradabad', area: 'Delhi Road / Civil Lines', category: 'Hospitality' },
  { name: 'Moradabad IT & Digital Services Guild', area: 'Civil Lines', category: 'IT & Software' },
  { name: 'Panchsheel Infrastructure Moradabad', area: 'Kanth Road', category: 'Real Estate & Infra' },
];

export function getMoradabadDirectory(division: MoradabadDivision): MoradabadDirectoryEntry[] {
  if (division === 'school') return MORADABAD_SCHOOLS_LIST;
  if (division === 'college') return MORADABAD_COLLEGES_LIST;
  return MORADABAD_COMPANIES_LIST;
}
