/**
 * RAML comparator for promptfoo using specialized RAML libraries
 * Converts both RAMLs to a normalized format before comparison
 */
function evaluate(actual, expected) {
  // Use specialized RAML parsing libraries
  const raml2obj = require('raml2obj');

  try {
    // Use Promise.all to process both RAML inputs in parallel
    return Promise.all([
      raml2obj.parse({ ramlString: actual }),
      raml2obj.parse({ ramlString: expected })
    ])
      .then(([actualObj, expectedObj]) => {
        // Normalize both objects to handle sorting/formatting differences
        const normalizedActual = normalizeRAMLObject(actualObj);
        const normalizedExpected = normalizeRAMLObject(expectedObj);

        // Compare the normalized objects
        const result = compareObjects(normalizedActual, normalizedExpected);

        return {
          pass: result.score >= 0.8,
          score: result.score,
          reason: result.message
        };
      })
      .catch((error) => {
        return {
          pass: false,
          score: 0,
          reason: `Error processing RAML with raml2obj: ${error.message}`
        };
      });
  } catch (error) {
    return {
      pass: false,
      score: 0,
      reason: `Error during RAML evaluation: ${error.message}`
    };
  }
}

/**
 * Normalizes a RAML object by extracting key information
 * This focuses on the API contract rather than exact textual representation
 */
function normalizeRAMLObject(obj) {
  // Extract essential API information
  return {
    title: obj.title,
    version: obj.version,
    baseUri: obj.baseUri,
    resources: extractResources(obj),
    types: extractTypes(obj)
  };
}

/**
 * Extracts resource information from a RAML object in a consistent format
 */
function extractResources(obj) {
  const resourceMap = {};

  // Process resources recursively
  function processResource(resource) {
    const relativeUri = resource.relativeUri;
    const methods = (resource.methods || []).map((method) => ({
      name: method.method,
      responses: Object.keys(method.responses || {}).sort()
    }));

    // Sort methods by name for consistent comparison
    methods.sort((a, b) => a.name.localeCompare(b.name));

    resourceMap[relativeUri] = {
      methods,
      uriParameters: Object.keys(resource.uriParameters || {}).sort()
    };

    // Process nested resources
    (resource.resources || []).forEach(processResource);
  }

  // Process all top-level resources
  (obj.resources || []).forEach(processResource);

  return resourceMap;
}

/**
 * Extracts type information from a RAML object
 */
function extractTypes(obj) {
  const typeMap = {};

  // Handle both 'types' (RAML 1.0) and 'schemas' (RAML 0.8)
  const types = obj.types || obj.schemas || {};

  Object.keys(types).forEach((typeName) => {
    // Extract essential type information: properties, required fields, etc.
    const type = types[typeName];
    typeMap[typeName] = {
      properties: Object.keys(type.properties || {}).sort(),
      required: (type.required || []).sort()
    };
  });

  return typeMap;
}

/**
 * Compares two normalized RAML objects and calculates a similarity score
 */
function compareObjects(actual, expected) {
  let score = 1.0;
  const issues = [];

  // Check basic API info
  if (actual.title !== expected.title) {
    score -= 0.05;
    issues.push(`API title mismatch: "${expected.title}" vs "${actual.title}"`);
  }

  if (actual.version !== expected.version) {
    score -= 0.05;
    issues.push(
      `API version mismatch: "${expected.version}" vs "${actual.version}"`
    );
  }

  // Compare resources/endpoints
  const actualPaths = Object.keys(actual.resources);
  const expectedPaths = Object.keys(expected.resources);

  // Check for missing endpoints
  const missingPaths = expectedPaths.filter((p) => !actualPaths.includes(p));
  if (missingPaths.length > 0) {
    const pathPenalty = (missingPaths.length / expectedPaths.length) * 0.3;
    score -= pathPenalty;
    issues.push(`Missing endpoints: ${missingPaths.join(', ')}`);
  }

  // For common paths, check methods
  expectedPaths
    .filter((p) => actualPaths.includes(p))
    .forEach((path) => {
      const actualResource = actual.resources[path];
      const expectedResource = expected.resources[path];

      // Compare HTTP methods
      const actualMethods = actualResource.methods.map((m) => m.name);
      const expectedMethods = expectedResource.methods.map((m) => m.name);

      const missingMethods = expectedMethods.filter(
        (m) => !actualMethods.includes(m)
      );
      if (missingMethods.length > 0) {
        const methodPenalty =
          (missingMethods.length / expectedMethods.length) * 0.1;
        score -= methodPenalty;
        issues.push(
          `Endpoint "${path}" missing methods: ${missingMethods.join(', ')}`
        );
      }
    });

  // Compare types
  const actualTypes = Object.keys(actual.types);
  const expectedTypes = Object.keys(expected.types);

  const missingTypes = expectedTypes.filter((t) => !actualTypes.includes(t));
  if (missingTypes.length > 0 && expectedTypes.length > 0) {
    const typePenalty = (missingTypes.length / expectedTypes.length) * 0.2;
    score -= typePenalty;
    issues.push(`Missing types: ${missingTypes.join(', ')}`);
  }

  return {
    score: Math.max(0, score),
    message:
      issues.length > 0
        ? issues.join('\n')
        : 'RAML specs are semantically equivalent'
  };
}

module.exports = evaluate;
