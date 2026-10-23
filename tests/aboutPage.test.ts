/**
 * About Page Academic Profile Test Suite
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Tests: Biographical accuracy, degree distinctions, career timeline,
 *        research interests, authored books, preprints vs published papers,
 *        patent status, and scholarly profile links.
 */

import assert from 'assert';
import {
  personalBio,
  academicDegrees,
  careerMilestones,
  researchInterests,
  teachingCourses,
  teachingContributions,
  authoredBooks,
  researchPreprints,
  patentInformation,
  professionalCertifications,
  scholarlyProfiles,
} from '../src/data/aboutData';
import { publicationRecords } from '../src/data/publicationData';

console.log('🧪 RUNNING ABOUT PAGE ACADEMIC PROFILE TESTS\n');

// 1. Biographical Identity & Core Metadata
console.log('--- 1. Biographical Identity & Tone ---');
assert.strictEqual(personalBio.name, 'Hemant Kumar Kushwaha', '1.1 Correct author name');
assert(personalBio.title.includes('Assistant Professor'), '1.2 Academic rank present');
assert(personalBio.title.includes('PhD Researcher'), '1.3 Doctoral researcher title present');
assert.strictEqual(personalBio.tagline, 'Teacher · Researcher · Thinker · Writer', '1.4 Platform tagline matches');
assert.strictEqual(
  personalBio.philosophy,
  'Learn what I teach. Explore what I research. Read what I think.',
  '1.5 Platform philosophy matches'
);
assert.strictEqual(personalBio.email, 'hemantsrmit@gmail.com', '1.6 Academic email matches CV');
assert(personalBio.summary.includes('12+ years'), '1.7 Stated 12+ years combined experience');
console.log('  ✅ PASS: 1.1-1.7 Biographical identity invariants verified');

// 2. Academic Background (Completed vs Ongoing Degrees)
console.log('\n--- 2. Academic Background (Completed vs Ongoing Degrees) ---');
assert.strictEqual(academicDegrees.length, 3, '2.1 Exactly 3 academic degrees');

const phd = academicDegrees.find((d) => d.id === 'phd-cs-ai');
assert(phd, '2.2 PhD degree record exists');
assert.strictEqual(phd.status, 'pursuing', '2.3 PhD is strictly marked as pursuing');
assert.strictEqual(phd.institution, 'Lamrin Tech Skills University', '2.4 PhD institution correct');
assert.strictEqual(phd.period, '2026 – 2029', '2.5 PhD period correct');

const mtech = academicDegrees.find((d) => d.id === 'mtech-it');
assert(mtech, '2.6 M.Tech degree record exists');
assert.strictEqual(mtech.status, 'completed', '2.7 M.Tech is marked completed');
assert.strictEqual(mtech.institution, 'SRM University', '2.8 M.Tech institution correct');

const btech = academicDegrees.find((d) => d.id === 'btech-cs');
assert(btech, '2.9 B.Tech degree record exists');
assert.strictEqual(btech.status, 'completed', '2.10 B.Tech is marked completed');
console.log('  ✅ PASS: 2.1-2.10 Academic degrees and ongoing PhD distinction verified');

// 3. Career Timeline (Chronological Milestones)
console.log('\n--- 3. Career Timeline ---');
assert.strictEqual(careerMilestones.length, 7, '3.1 Exactly 7 career milestones from CV');

// Check CGC University (Current)
const cgc = careerMilestones[0];
assert.strictEqual(cgc.organization, 'CGC University', '3.2 Most recent role at CGC University');
assert.strictEqual(cgc.endYear, 'present', '3.3 Current appointment is present');
assert.strictEqual(cgc.startYear, 2026, '3.4 Appointed January 2026');

// Check Quantum University
const quantum = careerMilestones[1];
assert.strictEqual(quantum.organization, 'Quantum University', '3.5 Quantum University role present');
assert.strictEqual(quantum.startYear, 2025, '3.6 Quantum start year 2025');

// Check EdTech venture
const edtech = careerMilestones[2];
assert.strictEqual(edtech.type, 'entrepreneurial', '3.7 EdTech venture marked entrepreneurial');

// Check Cyfuture India
const cyfuture = careerMilestones[3];
assert.strictEqual(cyfuture.organization, 'Cyfuture India Pvt. Ltd.', '3.8 Cyfuture role present');

// Check Alpha Cloud Labs Lead & SQE
const alphaLead = careerMilestones[4];
assert.strictEqual(alphaLead.role, 'Lead Data Quality Engineer', '3.9 Lead Data Quality Engineer role present');
const alphaSqe = careerMilestones[5];
assert.strictEqual(alphaSqe.role, 'Software Quality Engineer', '3.10 SQE role present');

// Check AITH Kanpur
const aith = careerMilestones[6];
assert(aith.organization.includes('AITH'), '3.11 AITH Kanpur lecturer role present');
console.log('  ✅ PASS: 3.1-3.11 All 7 chronological milestones verified');

// 4. Research Interests & SAMCS
console.log('\n--- 4. Research Interests ---');
assert(researchInterests.length >= 8, '4.1 Comprehensive research areas cataloged');
const samcs = researchInterests.find((r) => r.id === 'samcs');
assert(samcs, '4.2 SAMCS area exists');
assert.strictEqual(samcs.isDoctoralFocus, true, '4.3 SAMCS highlighted as doctoral focus');
console.log('  ✅ PASS: 4.1-4.3 Research interests and SAMCS doctoral direction verified');

// 5. Teaching Areas
console.log('\n--- 5. Teaching Profile ---');
assert.strictEqual(teachingCourses.length, 8, '5.1 Exactly 8 teaching subjects from CV');
const courseNames = teachingCourses.map((c) => c.name);
assert(courseNames.includes('Design and Analysis of Algorithms'), '5.2 Algorithms present');
assert(courseNames.includes('Computer Networks'), '5.3 Networks present');
assert(courseNames.includes('Discrete Mathematics'), '5.4 Discrete Maths present');
assert(teachingContributions.some((c) => c.title.includes('NEP 2020')), '5.5 NEP 2020 alignment present');
console.log('  ✅ PASS: 5.1-5.5 Teaching areas and pedagogical frameworks verified');

// 6. Publications Integrity (Exact 5 Papers)
console.log('\n--- 6. Publications Integrity ---');
assert.strictEqual(publicationRecords.length, 5, '6.1 Exactly 5 peer-reviewed publications');
console.log('  ✅ PASS: 6.1 Publication count invariant maintained');

// 7. Preprints vs Publications Separation
console.log('\n--- 7. Preprints vs Publications Separation ---');
assert.strictEqual(researchPreprints.length, 6, '7.1 Exactly 6 preprints listed');
researchPreprints.forEach((p) => {
  assert.strictEqual(p.status, 'preprint', '7.2 Status is strictly preprint');
});
console.log('  ✅ PASS: 7.1-7.2 Preprints clearly isolated from peer-reviewed articles');

// 8. Authored Books
console.log('\n--- 8. Authored Books ---');
assert.strictEqual(authoredBooks.length, 5, '8.1 Exactly 5 authored books from CV');
const bookPublishers = authoredBooks.map((b) => b.publisher);
assert(bookPublishers.includes('Eliva Press'), '8.2 Eliva Press monograph present');
assert(bookPublishers.includes('Amazon KDP'), '8.3 Amazon KDP books present');
console.log('  ✅ PASS: 8.1-8.3 Authored books catalog verified');

// 9. Patent Status (Filed, Not Granted)
console.log('\n--- 9. Patent Status ---');
assert.strictEqual(patentInformation.status, 'Patent filed', '9.1 Status is strictly Patent filed');
assert.strictEqual(patentInformation.year, 2026, '9.2 Year is 2026');
assert.strictEqual(patentInformation.institution, 'CGC University, Mohali', '9.3 Institution is CGC University');
assert(patentInformation.scopeDescription.includes('brand'), '9.4 Brand exposure analytics scope');
console.log('  ✅ PASS: 9.1-9.4 Patent filed status strictly verified without grant claims');

// 10. Certifications & Profile Links
console.log('\n--- 10. Certifications & Scholarly Profiles ---');
assert.strictEqual(professionalCertifications.length, 4, '10.1 Exactly 4 certifications');
assert(professionalCertifications.some((c) => c.title.includes('NEP-2020')), '10.2 UGC-FDP on NEP-2020 present');

assert.strictEqual(scholarlyProfiles.length, 6, '10.3 Exactly 6 scholarly profiles');
const profileMap = Object.fromEntries(scholarlyProfiles.map((p) => [p.platform, p.url]));
assert.strictEqual(profileMap['Google Scholar'], 'https://scholar.google.com/citations?user=0GJ55cMAAAAJ', '10.4 Scholar URL');
assert.strictEqual(profileMap['ResearchGate'], 'https://www.researchgate.net/profile/Hemant-Kushwaha-5', '10.5 ResearchGate URL');
assert.strictEqual(profileMap['ORCID'], 'https://orcid.org/0000-0002-1365-6063', '10.6 ORCID URL');
assert.strictEqual(profileMap['GitHub'], 'https://github.com/hemantkushwaha', '10.7 GitHub URL');
assert.strictEqual(profileMap['Zenodo'], 'https://doi.org/10.5281/zenodo.19152178', '10.8 Zenodo URL');
assert.strictEqual(profileMap['SSRN'], 'https://hq.ssrn.com/Participant.cfm?rectype=edit&partID=10714077', '10.9 SSRN URL');
console.log('  ✅ PASS: 10.1-10.9 Certifications and verified profiles validated');

console.log('\n================================================================');
console.log('🎉 ALL ABOUT PAGE ACADEMIC PROFILE TESTS PASSED');
console.log('================================================================\n');
