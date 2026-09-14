const isFilled = (value) => value !== undefined && value !== null && String(value).trim() !== "";

function isProfileComplete(candidate) {
  const fields = candidate.profileFields || {};
  const personal = fields.personal || {};
  const education = fields.education || {};
  const employment = fields.employment || {};
  const location = fields.location || {};
  const declarations = fields.declarations || {};

  const personalComplete = [
    candidate.name,
    candidate.phone,
    candidate.email,
    personal.dob,
    personal.maritalStatus,
  ].every(isFilled);

  const educationComplete = [
    education.highestQual,
    education.courseDegree,
    education.specialization,
    education.passedYear,
  ].every(isFilled) && (education.courseDegree !== "Other" || isFilled(education.otherDegree));

  const experienceTypeComplete = isFilled(employment.experienceType);
  let employmentComplete = false;
  if (employment.experienceType === "Fresher") {
    employmentComplete = [employment.fresherCategory, employment.fresherRole].every(isFilled);
  } else if (employment.experienceType === "Experienced") {
    employmentComplete = [employment.expSector, employment.expIndustry].every(isFilled) &&
      Array.isArray(employment.companies) && employment.companies.length > 0 &&
      employment.companies.every((company) => {
        const common = [company.companyName, company.designation, company.jobRole,
          company.currentPackage, company.expectedSalary].every(isFilled);
        const workStatus = company.stillWorking === "Yes"
          ? isFilled(company.noticePeriod)
          : company.stillWorking === "No" && isFilled(company.recentJobLeftDate);
        return common && workStatus;
      });
  }

  const locationComplete = [
    location.currentCity,
    location.currentArea,
    location.preferredLocation,
    location.relocate,
  ].every(isFilled) && (location.currentCity !== "Other" || isFilled(location.otherCity));

  return personalComplete && educationComplete && experienceTypeComplete && employmentComplete &&
    locationComplete && isFilled(candidate.documents?.resume) &&
    declarations.decl1 === true && declarations.decl2 === true;
}

module.exports = { isProfileComplete };
