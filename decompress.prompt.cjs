const fs = require('fs');
const path = require('path');

async function main({ vars: { id, compressed_input }, provider }) {
  // check if directory exists
  const input = fs.readFileSync(
    compressed_input.replace('{provider}', provider.id),
    'utf8'
  );
  return `Transform the following SlimSpec notation into RAML,
   do not output anything else\n${JSON.stringify(input)}`;
}

module.exports = main;
