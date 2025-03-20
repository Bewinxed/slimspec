#!/usr/bin/env bun

import { Command } from "commander";
import { compress } from "./commands/compress";
import { decompress } from "./commands/decompress";
import { version } from "../package.json";
import figlet from "figlet";
import gradient from "gradient-string";

// Create a beautiful banner
const bannerText = figlet.textSync("SlimSpec", { font: "Standard" });
const coloredBanner = gradient(["#ff5f6d", "#ffc371"]).multiline(bannerText);

console.log(coloredBanner);
console.log(
	gradient(["#ff5f6d", "#ffc371"])(
		"Towards Zero-Shot, API Spec Compression & Decompression\n"
	)
);

const program = new Command();

program
	.name("slimspec")
	.description(
		"A token-optimized format for representing API specifications with semantic precision"
	)
	.version(version);

program
	.command("c")
	.argument("<glob>", "File or directory pattern to process")
	.option(
		"-o, --output <dir>",
		"Output directory (if not specified, files are saved next to originals)"
	)
	.option(
		"-m, --model <name>",
		"LLM model to use",
		"anthropic:messages:claude-3-7-sonnet-latest"
	)
	.option(
		"-p, --prompt <file>",
		"Custom compression prompt file",
		"./prompts/slimspec-prompt-compress.txt"
	)
	.description("Compress API specifications to SlimSpec format")
	.action(compress);

program
	.command("d")
	.argument("<glob>", "File or directory pattern to process")
	.option(
		"-o, --output <dir>",
		"Output directory (if not specified, files are saved next to originals)"
	)
	.option(
		"-m, --model <name>",
		"LLM model to use",
		"anthropic:messages:claude-3-7-sonnet-latest"
	)
	.option(
		"-p, --prompt <file>",
		"Custom decompression prompt file",
		"./prompts/slimspec-prompt-decompress.txt"
	)
	.description("Decompress SlimSpec to full API specifications")
	.action(decompress);

program.parse(process.argv);
