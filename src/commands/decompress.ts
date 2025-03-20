// src/commands/decompress.ts
import { glob } from "glob";
import * as path from "path";
import * as fs from "fs";
import { createSpinner } from "nanospinner";
import kleur from "kleur";
import { callLLM } from "../utils/llm";
import { Stats } from "../utils/stats";
import { formatBytes, formatTokens } from "../utils/format";

interface DecompressOptions {
	output: string;
	model: string;
	prompt: string;
}

export async function decompress(
	globPattern: string,
	options: DecompressOptions
): Promise<void> {
	// Normalize path for cross-platform compatibility
	const normalizedPattern = path.normalize(globPattern);

	// Load decompression prompt
	let prompt: string;
	try {
		prompt = fs.readFileSync(options.prompt, "utf-8");
		console.log(
			`${kleur.blue("→")} Using decompression prompt: ${kleur.yellow(
				options.prompt
			)}`
		);
	} catch (error) {
		console.error(kleur.red(`Error loading prompt file: ${options.prompt}`));
		process.exit(1);
	}

	// Find files to process - using normalized pattern
	const spinner = createSpinner("Finding files to process...").start();

	// Configure glob with cross-platform options
	const globOptions = {
		nodir: true,
		windows: process.platform === "win32", // Enable Windows-specific behavior when on Windows
	};

	let files: string[] = [];
	try {
		files = await glob(normalizedPattern, globOptions);

		// If no files found and pattern might be a direct file path, try direct file check
		if (files.length === 0 && !normalizedPattern.includes("*")) {
			if (
				fs.existsSync(normalizedPattern) &&
				fs.statSync(normalizedPattern).isFile()
			) {
				files = [normalizedPattern];
			}
		}
	} catch (error) {
		spinner.error({
			text: `Error searching for files: ${error}`,
		});
		process.exit(1);
	}

	if (files.length === 0) {
		spinner.error({
			text: `No files found matching pattern: ${kleur.yellow(
				normalizedPattern
			)}`,
		});
		process.exit(1);
	}

	spinner.success({
		text: `Found ${kleur.yellow(files.length.toString())} files to process`,
	});

	// If output directory specified, create it if needed
	let outputDir: string | undefined;
	if (options.output) {
		outputDir = path.resolve(options.output);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
			console.log(
				`${kleur.blue("→")} Created output directory: ${kleur.yellow(
					outputDir
				)}`
			);
		}
	}

	// Track statistics
	const stats = new Stats();

	// Process each file
	for (const file of files) {
		const fileName = path.basename(file, ".apaic"); // Remove .apaic extension if present
		const filePath = path.dirname(file);

		let outputFile: string;

		if (outputDir) {
			// If output directory specified, maintain directory structure
			const relativeDir = path.relative(process.cwd(), filePath);
			const outputPath = path.join(outputDir, relativeDir);

			// Create subdirectory if needed
			if (!fs.existsSync(outputPath)) {
				fs.mkdirSync(outputPath, { recursive: true });
			}

			outputFile = path.join(outputPath, fileName);
		} else {
			// Output to same directory as input file
			outputFile = path.join(filePath, fileName);
		}

		const fileSpinner = createSpinner(
			`Decompressing ${kleur.cyan(file)}`
		).start();
		try {
			// Better file extension check that works cross-platform
			const fileExt = path.extname(file).toLowerCase();
			const isApaic = fileExt === ".apaic";
			const isExplicitlySpecified =
				normalizedPattern.includes(file) ||
				normalizedPattern.includes(path.basename(file));

			// Only process .apaic files or files explicitly specified
			if (!isApaic && fileExt !== "" && !isExplicitlySpecified) {
				fileSpinner.warn({
					text: `Skipping non-apaic file: ${kleur.cyan(file)}`,
				});
				continue;
			}

			const content = fs.readFileSync(file, "utf-8");
			const compressedSize = content.length;

			// Extract original format hint from comment if available
			const originalFormatMatch = content.match(
				/<!-- SlimSpec compressed from (.*?) using/
			);
			const originalFormat = originalFormatMatch
				? originalFormatMatch[1]
				: "unknown";

			// Call LLM to decompress
			const result = await callLLM({
				model: options.model,
				prompt,
				content,
			});

			// Write output
			fs.writeFileSync(outputFile, result);

			const decompressedSize = result.length;
			const ratio = ((compressedSize / decompressedSize) * 100).toFixed(2);

			stats.addFile({
				path: file,
				originalSize: compressedSize,
				compressedSize: decompressedSize, // In this case, compressed is the original and decompressed is the output
				ratio: parseFloat(ratio),
			});

			fileSpinner.success({
				text: `Decompressed ${kleur.cyan(file)} → ${kleur.green(
					outputFile
				)} (expanded to ${kleur.yellow(
					(100 / parseFloat(ratio)).toFixed(2) + "%"
				)} of compressed size)`,
			});
		} catch (error) {
			fileSpinner.error({
				text: `Failed to decompress ${kleur.cyan(file)}: ${error}`,
			});
		}
	}

	// Print summary
	console.log("\n" + kleur.bold().underline("Decompression Summary:"));
	console.log(
		`${kleur.blue("→")} Processed: ${kleur.yellow(
			stats.fileCount.toString()
		)} files`
	);
	console.log(
		`${kleur.blue("→")} Compressed size: ${kleur.yellow(
			formatBytes(stats.totalOriginalSize)
		)}`
	);
	console.log(
		`${kleur.blue("→")} Decompressed size: ${kleur.yellow(
			formatBytes(stats.totalCompressedSize)
		)}`
	);
	console.log(
		`${kleur.blue("→")} Average expansion ratio: ${kleur.yellow(
			(100 / stats.averageRatio).toFixed(2) + "%"
		)}`
	);
	console.log(
		`${kleur.blue("→")} Estimated tokens expanded: ${kleur.yellow(
			formatTokens(-stats.estimatedTokensSaved)
		)}`
	);
}
