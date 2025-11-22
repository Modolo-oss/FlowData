/**
 * File Type Detector
 * Detects file type from buffer and filename
 */

export type FileType = "csv" | "json" | "image" | "pdf" | "word" | "text" | "unknown";

export interface FileInfo {
	type: FileType;
	mimeType: string;
	extension: string;
}

export function detectFileType(buffer: Buffer, filename: string): FileInfo {
	const extension = filename.split(".").pop()?.toLowerCase() || "";
	
	// Check MIME type from buffer (magic bytes)
	const mimeType = detectMimeType(buffer, extension);
	
	// Determine file type
	let type: FileType = "unknown";
	
	if (mimeType.startsWith("text/csv") || extension === "csv") {
		type = "csv";
	} else if (mimeType === "application/json" || extension === "json") {
		type = "json";
	} else if (mimeType.startsWith("image/")) {
		type = "image";
	} else if (mimeType === "application/pdf" || extension === "pdf") {
		type = "pdf";
	} else if (
		mimeType === "application/msword" ||
		mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
		extension === "doc" ||
		extension === "docx"
	) {
		type = "word";
	} else if (mimeType.startsWith("text/")) {
		type = "text";
	}
	
	return {
		type,
		mimeType,
		extension,
	};
}

function detectMimeType(buffer: Buffer, extension: string): string {
	// Check magic bytes
	const bytes = buffer.slice(0, 12);
	
	// JSON detection - PRIORITY: Check extension first, then content
	if (extension === "json") {
		return "application/json";
	}
	
	// PDF
	if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
		return "application/pdf";
	}
	
	// PNG
	if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
		return "image/png";
	}
	
	// JPEG
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return "image/jpeg";
	}
	
	// GIF
	if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
		return "image/gif";
	}
	
	// ZIP (could be DOCX, XLSX, etc.)
	if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
		// Check if it's a DOCX by looking for word/document.xml
		// For now, assume it could be Word if extension matches
		return "application/zip";
	}
	
	// JSON (starts with { or [) - try parse full buffer if reasonable size
	const textStart = buffer.slice(0, 1000).toString("utf-8").trim();
	const firstChar = textStart.charAt(0);
	if (firstChar === "{" || firstChar === "[") {
		try {
			// Try to parse a larger chunk to verify it's JSON
			const fullText = buffer.toString("utf-8").trim();
			JSON.parse(fullText); // If this succeeds, it's valid JSON
			return "application/json";
		} catch {
			// Not valid JSON
		}
	}
	
	// CSV (check if it looks like CSV) - but ONLY if not already detected as JSON
	if (textStart.includes(",") && textStart.split("\n").length > 1 && firstChar !== "{" && firstChar !== "[") {
		return "text/csv";
	}
	
	// Plain text
	if (isText(buffer)) {
		return "text/plain";
	}
	
	return "application/octet-stream";
}

function isText(buffer: Buffer): boolean {
	// Check if buffer contains mostly printable ASCII characters
	const sample = buffer.slice(0, Math.min(512, buffer.length));
	let printableCount = 0;
	
	for (let i = 0; i < sample.length; i++) {
		const byte = sample[i];
		// Printable ASCII: 32-126, plus common whitespace (9, 10, 13)
		if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
			printableCount++;
		}
	}
	
	// Consider text if >80% printable
	return printableCount / sample.length > 0.8;
}


