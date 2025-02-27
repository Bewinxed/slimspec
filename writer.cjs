const fs = require('fs');
const path = require('path');

async function main(output, { vars: { compressed_output }, provider }) {
  // check if directory exists
  if (!fs.existsSync(path.dirname(compressed_output))) {
    fs.mkdirSync(path.dirname(compressed_output), { recursive: true });
  }
  fs.writeFileSync(
    compressed_output.replace('{provider}', provider.id),
    output
  );
  return true;
}

module.exports = main;
