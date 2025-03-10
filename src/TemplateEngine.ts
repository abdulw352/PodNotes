import { htmlToMarkdown, Notice } from "obsidian";
import type { Episode } from "src/types/Episode";
import Fuse from "fuse.js";
import { plugin } from "src/store";
import { get } from "svelte/store";
import getUrlExtension from "./utility/getUrlExtension";

interface Tags {
	[tag: string]: string | ((...args: unknown[]) => string);
}

type AddTagFn = (
	tag: Lowercase<string>,
	value: string | ((...args: unknown[]) => string),
) => void;
type ReplacerFn = (template: string) => string;

function useTemplateEngine(): Readonly<[ReplacerFn, AddTagFn]> {
	const tags: Tags = {};

	function addTag(
		tag: Lowercase<string>,
		value: string | ((...args: unknown[]) => string),
	): void {
		tags[tag] = value;
	}

	function replacer(template: string): string {
		return template.replace(
			/\{\{(.*?)(:\s*?.+?)?\}\}/g,
			(match: string, tagId: string, params: string) => {
				const tagValue = tags[tagId.toLowerCase()];
				if (tagValue === null || tagValue === undefined) {
					const fuse = new Fuse(Object.keys(tags), {
						shouldSort: true,
						findAllMatches: false,
						threshold: 0.4,
						isCaseSensitive: false,
					});

					const similarTag = fuse.search(tagId);

					new Notice(
						`Tag ${tagId} is invalid.${
							similarTag.length > 0
								? ` Did you mean ${similarTag[0].item}?`
								: ""
						}`,
					);
					return match;
				}

				if (typeof tagValue === "function") {
					if (params) {
						// Remove initial colon with splice.
						const splitParams = params.slice(1).split(",");
						const args = Array.isArray(splitParams) ? splitParams : [params];

						return tagValue(...args);
					}

					return tagValue();
				}

				return tagValue;
			},
		);
	}

	return [replacer, addTag] as const;
}

export function NoteTemplateEngine(template: string, episode: Episode) {
	const [replacer, addTag] = useTemplateEngine();

	addTag("title", episode.title);
	addTag("description", (prependToLines?: string) => {
		// reduce multiple new lines
		const sanitizeDescription = htmlToMarkdown(episode.description).replace(
			/\n{3,}/g,
			"\n\n",
		);
		if (prependToLines) {
			return sanitizeDescription
				.split("\n")
				.map((str) => `${prependToLines}${str}`)
				.join("\n");
		}

		return sanitizeDescription;
	});
	addTag("content", (prependToLines?: string) => {
		if (prependToLines) {
			return htmlToMarkdown(episode.content)
				.split("\n")
				.map((str) => `${prependToLines}${str}`)
				.join("\n");
		}

		return htmlToMarkdown(episode.content);
	});
	addTag("safetitle", replaceIllegalFileNameCharactersInString(episode.title));
	addTag("url", episode.url);
	addTag("date", (format?: string) =>
		episode.episodeDate
			? window.moment(episode.episodeDate).format(format ?? "YYYY-MM-DD")
			: "",
	);
	addTag(
		"podcast",
		replaceIllegalFileNameCharactersInString(episode.podcastName),
	);
	addTag("artwork", episode.artworkUrl ?? "");

	return replacer(template);
}

export function TimestampTemplateEngine(template: string) {
	const [replacer, addTag] = useTemplateEngine();

	addTag("time", (format?: string) =>
		get(plugin).api.getPodcastTimeFormatted(format ?? "HH:mm:ss"),
	);
	addTag("linktime", (format?: string) =>
		get(plugin).api.getPodcastTimeFormatted(format ?? "HH:mm:ss", true),
	);

	return replacer(template);
}

export function FilePathTemplateEngine(template: string, episode: Episode) {
	const [replacer, addTag] = useTemplateEngine();

	addTag("title", (whitespaceReplacement?: string) => {
		const legalTitle = replaceIllegalFileNameCharactersInString(episode.title);
		if (whitespaceReplacement) {
			return legalTitle.replace(/\s+/g, whitespaceReplacement);
		}

		return legalTitle;
	});
	addTag("podcast", (whitespaceReplacement?: string) => {
		const legalName = replaceIllegalFileNameCharactersInString(
			episode.podcastName,
		);
		if (whitespaceReplacement) {
			return legalName.replace(/\s+/g, whitespaceReplacement);
		}

		return legalName;
	});
	addTag("date", (format?: string) =>
		episode.episodeDate
			? window.moment(episode.episodeDate).format(format ?? "YYYY-MM-DD")
			: "",
	);

	return replacer(template);
}

export function DownloadPathTemplateEngine(template: string, episode: Episode) {
	// Removing the template extension, as this is added automatically depending on file type.
	const templateExtension = getUrlExtension(template);
	const templateWithoutExtension = templateExtension
		? template.replace(templateExtension, "")
		: template;

	const [replacer, addTag] = useTemplateEngine();

	addTag("title", (whitespaceReplacement?: string) => {
		const legalTitle = replaceIllegalFileNameCharactersInString(episode.title);
		if (whitespaceReplacement) {
			return legalTitle.replace(/\s+/g, whitespaceReplacement);
		}

		return legalTitle;
	});
	addTag("podcast", (whitespaceReplacement?: string) => {
		const legalName = replaceIllegalFileNameCharactersInString(
			episode.podcastName,
		);
		if (whitespaceReplacement) {
			return legalName.replace(/\s+/g, whitespaceReplacement);
		}

		return legalName;
	});
	addTag("date", (format?: string) =>
		episode.episodeDate
			? window.moment(episode.episodeDate).format(format ?? "YYYY-MM-DD")
			: "",
	);

	return replacer(templateWithoutExtension);
}

export function TranscriptTemplateEngine(
	template: string,
	episode: Episode,
	transcription: string,
) {
	const [replacer, addTag] = useTemplateEngine();

	addTag("title", (whitespaceReplacement?: string) => {
		const legalTitle = replaceIllegalFileNameCharactersInString(episode.title);
		if (whitespaceReplacement) {
			return legalTitle.replace(/\s+/g, whitespaceReplacement);
		}
		return legalTitle;
	});
	addTag("podcast", (whitespaceReplacement?: string) => {
		const legalName = replaceIllegalFileNameCharactersInString(
			episode.podcastName,
		);
		if (whitespaceReplacement) {
			return legalName.replace(/\s+/g, whitespaceReplacement);
		}
		return legalName;
	});
	addTag("date", (format?: string) =>
		episode.episodeDate
			? window.moment(episode.episodeDate).format(format ?? "YYYY-MM-DD")
			: "",
	);
	addTag("transcript", transcription);
	addTag("description", (prependToLines?: string) => {
		if (prependToLines) {
			return htmlToMarkdown(episode.description)
				.split("\n")
				.map((str) => `${prependToLines}${str}`)
				.join("\n");
		}

		return htmlToMarkdown(episode.description);
	});
	addTag("url", episode.url);
	addTag("artwork", episode.artworkUrl ?? "");

	return replacer(template);
}

function replaceIllegalFileNameCharactersInString(string: string) {
	return string
		.replace(/[\\,#%&{}/*<>$'":@\u2023|\\.\?]/g, "") // Replace illegal file name characters with empty string
		.replace(/\n/, " ") // replace newlines with spaces
		.replace("  ", " "); // replace multiple spaces with single space to make sure we don't have double spaces in the file name
}
