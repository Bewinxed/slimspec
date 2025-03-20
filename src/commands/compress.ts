// src/commands/compress.ts
import { glob } from "glob";
import * as path from "path";
import * as fs from "fs";
import { createSpinner } from "nanospinner";
import kleur from "kleur";
import { callLLM } from "../utils/llm";
import { Stats } from "../utils/stats";
import { formatBytes, formatTokens } from "../utils/format";

interface CompressOptions {
	output: string;
	model: string;
	prompt: string;
}

export async function compress(
	globPattern: string,
	options: CompressOptions
): Promise<void> {
	// Normalize path for cross-platform compatibility
	const normalizedPattern = path.normalize(globPattern);

	// Load compression prompt
	let prompt: string;
	try {
		prompt = fs.readFileSync(options.prompt, "utf-8");
		console.log(
			`${kleur.blue("→")} Using compression prompt: ${kleur.yellow(
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
		const fileName = path.basename(file);
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

			outputFile = path.join(outputPath, `${fileName}.apaic`);
		} else {
			// Output to same directory as input file
			outputFile = path.join(filePath, `${fileName}.apaic`);
		}

		const fileSpinner = createSpinner(
			`Compressing ${kleur.cyan(file)}`
		).start();
		try {
			const content = fs.readFileSync(file, "utf-8");
			const originalSize = content.length;

			// Call LLM to compress
			const result = await callLLM({
				model: options.model,
				prompt,
				content,
			});

			// Write output
			const metadata = `<!-- SlimSpec compressed from ${fileName} using ${options.model} -->\n\n`;
			const compressedContent = metadata + result;
			fs.writeFileSync(outputFile, compressedContent);

			const compressedSize = compressedContent.length;
			const ratio = ((compressedSize / originalSize) * 100).toFixed(2);

			stats.addFile({
				path: file,
				originalSize,
				compressedSize,
				ratio: parseFloat(ratio),
			});

			fileSpinner.success({
				text: `Compressed ${kleur.cyan(file)} → ${kleur.green(
					outputFile
				)} (${kleur.yellow(ratio + "%")} of original size)`,
			});
		} catch (error) {
			fileSpinner.error({
				text: `Failed to compress ${kleur.cyan(file)}: ${error}`,
			});
		}
	}

	// Print summary
	console.log("\n" + kleur.bold().underline("Compression Summary:"));
	console.log(
		`${kleur.blue("→")} Processed: ${kleur.yellow(
			stats.fileCount.toString()
		)} files`
	);
	console.log(
		`${kleur.blue("→")} Original size: ${kleur.yellow(
			formatBytes(stats.totalOriginalSize)
		)}`
	);
	console.log(
		`${kleur.blue("→")} Compressed size: ${kleur.yellow(
			formatBytes(stats.totalCompressedSize)
		)}`
	);
	console.log(
		`${kleur.blue("→")} Average ratio: ${kleur.yellow(
			stats.averageRatio.toFixed(2) + "%"
		)}`
	);
	console.log(
		`${kleur.blue("→")} Estimated tokens saved: ${kleur.yellow(
			formatTokens(stats.estimatedTokensSaved)
		)}`
	);
}
