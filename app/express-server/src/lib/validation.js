const MAX_STRING_LENGTH = 2048;
const MAX_PREV_REFERENCES = 50;

const STRING_FIELDS = [
  'dvctId',
  'usecaseContractId',
  'usecaseContractTitle',
  'contractId',
  'dataId',
  'participantId',
  'participantSourceId',
  'dataProviderId',
  'dataConsumerId',
];

const isNonNegativeNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const validateIncentive = (incentive, field, errors) => {
  if (incentive === undefined || incentive === null) {
    return;
  }
  if (typeof incentive !== 'object' || Array.isArray(incentive)) {
    errors.push(`${field} must be an object`);
    return;
  }
  if (incentive.numPoints !== undefined && !isNonNegativeNumber(incentive.numPoints)) {
    errors.push(`${field}.numPoints must be a non-negative number`);
  }
  if (incentive.factor !== undefined && !(typeof incentive.factor === 'number' && Number.isFinite(incentive.factor))) {
    errors.push(`${field}.factor must be a number`);
  }
  if (incentive.factorCheck !== undefined && typeof incentive.factorCheck !== 'boolean') {
    errors.push(`${field}.factorCheck must be a boolean`);
  }
};

// Returns a list of validation errors for a trace node payload (empty when valid).
const validateNodeInput = (input) => {
  const errors = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return ['Request body must be a JSON object'];
  }

  STRING_FIELDS.forEach((field) => {
    const value = input[field];
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value !== 'string') {
      errors.push(`${field} must be a string`);
    } else if (value.length > MAX_STRING_LENGTH) {
      errors.push(`${field} is too long`);
    }
  });

  if (input.participantShare !== undefined && !isNonNegativeNumber(input.participantShare)) {
    errors.push('participantShare must be a non-negative number');
  }

  if (input.dataConsumerIsAIProvider !== undefined && typeof input.dataConsumerIsAIProvider !== 'boolean') {
    errors.push('dataConsumerIsAIProvider must be a boolean');
  }

  if (input.prevDataId !== undefined) {
    if (!Array.isArray(input.prevDataId)) {
      errors.push('prevDataId must be an array of strings');
    } else if (input.prevDataId.length > MAX_PREV_REFERENCES) {
      errors.push(`prevDataId accepts at most ${MAX_PREV_REFERENCES} references`);
    } else if (input.prevDataId.some((ref) => typeof ref !== 'string' || ref.length > MAX_STRING_LENGTH)) {
      errors.push('prevDataId must be an array of strings');
    }
  }

  validateIncentive(input.incentiveForDataProvider, 'incentiveForDataProvider', errors);
  validateIncentive(input.extraIncentiveForAIProvider, 'extraIncentiveForAIProvider', errors);

  if (input.organizationNames !== undefined) {
    const valid =
      Array.isArray(input.organizationNames) &&
      input.organizationNames.length <= MAX_PREV_REFERENCES * 2 &&
      input.organizationNames.every(
        (entry) =>
          entry &&
          typeof entry.organizationId === 'string' &&
          entry.organizationId.length <= MAX_STRING_LENGTH &&
          typeof entry.name === 'string' &&
          entry.name.length <= 256,
      );
    if (!valid) {
      errors.push('organizationNames must be a list of { organizationId, name } strings');
    }
  }

  return errors;
};

module.exports = { validateNodeInput };
