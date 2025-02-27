// src/commands/decompress.ts
import { glob } from 'glob';
import { basename, dirname, join, relative, resolve, extname } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createSpinner } from 'nanospinner';
import kleur from 'kleur';
import { callLLM } from '../utils/llm';
import { Stats } from '../utils/stats';
import { formatBytes, formatTokens } from '../utils/format';

interface DecompressOptions {
  output: string;
  model: string;
  prompt: string;
}

export async function decompress(
  globPattern: string,
  options: DecompressOptions
): Promise<void> {
  // Load decompression prompt
  let prompt: string;
  try {
    prompt = readFileSync(options.prompt, 'utf-8');
    console.log(
      `${kleur.blue('→')} Using decompression prompt: ${kleur.yellow(
        options.prompt
      )}`
    );
  } catch (error) {
    console.error(kleur.red(`Error loading prompt file: ${options.prompt}`));
    process.exit(1);
  }

  // Find files to process
  const spinner = createSpinner('Finding files to process...').start();
  const files = await glob(globPattern, { nodir: true });

  if (files.length === 0) {
    spinner.error({
      text: `No files found matching pattern: ${kleur.yellow(globPattern)}`
    });
    process.exit(1);
  }

  spinner.success({
    text: `Found ${kleur.yellow(files.length.toString())} files to process`
  });

  // If output directory specified, create it if needed
  let outputDir: string | undefined;
  if (options.output) {
    outputDir = resolve(options.output);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
      console.log(
        `${kleur.blue('→')} Created output directory: ${kleur.yellow(
          outputDir
        )}`
      );
    }
  }

  // Track statistics
  const stats = new Stats();

  // Process each file
  for (const file of files) {
    const fileName = basename(file, '.apaic'); // Remove .apaic extension if present
    const filePath = dirname(file);

    let outputFile: string;

    if (outputDir) {
      // If output directory specified, maintain directory structure
      const relativeDir = relative(process.cwd(), filePath);
      const outputPath = join(outputDir, relativeDir);

      // Create subdirectory if needed
      if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true });
      }

      outputFile = join(outputPath, fileName);
    } else {
      // Output to same directory as input file
      outputFile = join(filePath, fileName);
    }

    const fileSpinner = createSpinner(
      `Decompressing ${kleur.cyan(file)}`
    ).start();
    try {
      // Only process .apaic files or files explicitly specified
      if (
        !file.endsWith('.apaic') &&
        extname(file) !== '' &&
        !globPattern.includes(file)
      ) {
        fileSpinner.warn({
          text: `Skipping non-apaic file: ${kleur.cyan(file)}`
        });
        continue;
      }

      const content = readFileSync(file, 'utf-8');
      const compressedSize = content.length;

      // Extract original format hint from comment if available
      const originalFormatMatch = content.match(
        /<!-- SlimSpec compressed from (.*?) using/
      );
      const originalFormat = originalFormatMatch
        ? originalFormatMatch[1]
        : 'unknown';

      // Call LLM to decompress
      const result = await callLLM({
        model: options.model,
        prompt,
        content
      });

      // Write output
      writeFileSync(outputFile, result);

      const decompressedSize = result.length;
      const ratio = ((compressedSize / decompressedSize) * 100).toFixed(2);

      stats.addFile({
        path: file,
        originalSize: compressedSize,
        compressedSize: decompressedSize, // In this case, compressed is the original and decompressed is the output
        ratio: parseFloat(ratio)
      });

      fileSpinner.success({
        text: `Decompressed ${kleur.cyan(file)} → ${kleur.green(
          outputFile
        )} (expanded to ${kleur.yellow(
          (100 / parseFloat(ratio)).toFixed(2) + '%'
        )} of compressed size)`
      });
    } catch (error) {
      fileSpinner.error({
        text: `Failed to decompress ${kleur.cyan(file)}: ${error}`
      });
    }
  }

  // Print summary
  console.log('\n' + kleur.bold().underline('Decompression Summary:'));
  console.log(
    `${kleur.blue('→')} Processed: ${kleur.yellow(
      stats.fileCount.toString()
    )} files`
  );
  console.log(
    `${kleur.blue('→')} Compressed size: ${kleur.yellow(
      formatBytes(stats.totalOriginalSize)
    )}`
  );
  console.log(
    `${kleur.blue('→')} Decompressed size: ${kleur.yellow(
      formatBytes(stats.totalCompressedSize)
    )}`
  );
  console.log(
    `${kleur.blue('→')} Average expansion ratio: ${kleur.yellow(
      (100 / stats.averageRatio).toFixed(2) + '%'
    )}`
  );
  console.log(
    `${kleur.blue('→')} Estimated tokens expanded: ${kleur.yellow(
      formatTokens(-stats.estimatedTokensSaved)
    )}`
  );
}
