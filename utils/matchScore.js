/**
 * Computes a 0-100 match score between a candidate and a job by comparing:
 *  - Skills overlap (IT + non-IT) vs required/preferred skills   -> 40%
 *  - Experience fit vs required experience range                -> 25%
 *  - Qualification / education match                             -> 20%
 *  - Salary expectation vs job budget                            -> 15%
 *
 * This is a deterministic, explainable scoring heuristic (not a black box),
 * which is what most recruitment ATS "AI match" features actually use.
 */
function normalize(str = "") {
  return String(str).toLowerCase().trim();
}

function skillOverlapScore(candidateSkills = [], jobSkills = []) {
  if (!jobSkills.length) return 100; // nothing required -> full marks
  const candSet = new Set(candidateSkills.map(normalize));
  let hits = 0;
  jobSkills.forEach((s) => {
    if (candSet.has(normalize(s))) hits += 1;
  });
  return Math.round((hits / jobSkills.length) * 100);
}

function experienceScore(candidateYears = 0, minExp, maxExp) {
  if (minExp == null && maxExp == null) return 100;
  const min = minExp ?? 0;
  const max = maxExp ?? min + 5;
  if (candidateYears >= min && candidateYears <= max) return 100;
  const distance = candidateYears < min ? min - candidateYears : candidateYears - max;
  return Math.max(0, 100 - distance * 15);
}

function qualificationScore(candidateQualification = "", requiredQualification = "") {
  if (!requiredQualification) return 100;
  const c = normalize(candidateQualification);
  const r = normalize(requiredQualification);
  if (!c) return 30;
  if (c === r) return 100;
  if (r.includes(c) || c.includes(r)) return 80;
  return 40;
}

function salaryScore(expectedSalary, minSalary, maxSalary) {
  if (!expectedSalary || (!minSalary && !maxSalary)) return 100;
  const max = maxSalary ?? minSalary;
  const min = minSalary ?? 0;
  if (expectedSalary >= min && expectedSalary <= max) return 100;
  if (expectedSalary < min) return 100; // candidate is cheaper than budget
  const overBy = expectedSalary - max;
  const pctOver = overBy / (max || 1);
  return Math.max(0, Math.round(100 - pctOver * 100));
}

function computeMatchScore(candidate, job) {
  const candidateSkills = [
    ...(candidate?.itSkills?.primarySkills || []),
    ...(candidate?.itSkills?.secondarySkills || []),
    ...(candidate?.itSkills?.programmingLanguages || []),
    ...(candidate?.nonItSkills?.functionalSkills || []),
  ];
  const jobSkills = [
    ...(job?.description?.requiredSkills || []),
    ...(job?.description?.preferredSkills || []),
  ];

  const sSkill = skillOverlapScore(candidateSkills, jobSkills);
  const sExp = experienceScore(
    candidate?.yearsOfExperience || candidate?.career?.totalExperienceYears || 0,
    job?.description?.experienceRangeMin,
    job?.description?.experienceRangeMax
  );
  const sQual = qualificationScore(
    candidate?.qualification,
    job?.requirements?.educationLevel
  );
  const sSalary = salaryScore(
    candidate?.career?.expectedSalary,
    job?.compensation?.minSalary,
    job?.compensation?.maxSalary
  );

  const total = sSkill * 0.4 + sExp * 0.25 + sQual * 0.2 + sSalary * 0.15;
  return Math.round(total);
}

module.exports = { computeMatchScore };
