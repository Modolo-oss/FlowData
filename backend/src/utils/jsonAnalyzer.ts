/**
 * JSON Analyzer
 * Analyzes JSON data and extracts statistics
 */

import { DataInsights, analyzeCSV } from "./csvAnalyzer.js";

/**
 * FLEXIBLE JSON Analyzer - Accepts ANY JSON structure and intelligently parses it
 * No format requirements - adapts to whatever user uploads
 */
export function analyzeJSON(jsonData: any): DataInsights {
	if (!jsonData) {
		return {
			num_samples: 0,
			columns: [],
			statistics: {},
			correlations: [],
			clusters: [],
			trends: [],
			outliers: [],
		};
	}

	// FLEXIBLE: Handle array of ANYTHING
	if (Array.isArray(jsonData)) {
		if (jsonData.length === 0) {
			return {
				num_samples: 0,
				columns: [],
				statistics: {},
				correlations: [],
				clusters: [],
				trends: [],
				outliers: [],
			};
		}

		// Check first item to determine structure
		const firstItem = jsonData[0];
		
		// Array of objects (table-like data)
		if (typeof firstItem === "object" && firstItem !== null && !Array.isArray(firstItem)) {
			// Collect ALL possible columns from ALL items (handle missing keys)
			const allColumns = new Set<string>();
			jsonData.forEach((item) => {
				if (typeof item === "object" && item !== null) {
					Object.keys(item).forEach(key => allColumns.add(key));
				}
			});
			const columns = Array.from(allColumns);

			// Convert to rows
			const rows = jsonData.map((item) => {
				const row: Record<string, string> = {};
				for (const col of columns) {
					const value = item?.[col];
					// Handle nested objects/arrays by stringifying
					if (value !== null && value !== undefined) {
						if (typeof value === "object") {
							row[col] = JSON.stringify(value);
						} else {
							row[col] = String(value);
						}
					} else {
						row[col] = "";
					}
				}
				return row;
			});

			// Convert to CSV-like string and use CSV analyzer
			const csvLines = [columns.join(",")];
			for (const row of rows) {
				// Escape commas and quotes in values
				csvLines.push(columns.map((col) => {
					const val = row[col] || "";
					if (val.includes(",") || val.includes('"') || val.includes("\n")) {
						return `"${val.replace(/"/g, '""')}"`;
					}
					return val;
				}).join(","));
			}
			const csvText = csvLines.join("\n");

			// Use CSV analyzer (it can handle this)
			return analyzeCSV(csvText);
		}
		
		// Array of primitives (numbers, strings, etc) - treat as single column
		else {
			const values = jsonData.map((item, idx) => ({
				index: idx + 1,
				value: String(item !== null && item !== undefined ? item : ""),
			}));
			
			const csvLines = ["index,value"];
			values.forEach(v => {
				csvLines.push(`${v.index},"${v.value.replace(/"/g, '""')}"`);
			});
			return analyzeCSV(csvLines.join("\n"));
		}
	}

	// FLEXIBLE: Handle single object (any structure - this is the MAIN case for nested JSON)
	if (typeof jsonData === "object" && jsonData !== null && !Array.isArray(jsonData)) {
		// FLATTEN nested objects recursively to get all keys
		const flattenObject = (obj: any, prefix = "", result: Record<string, any> = {}): Record<string, any> => {
			for (const key in obj) {
				if (obj.hasOwnProperty(key)) {
					const newKey = prefix ? `${prefix}.${key}` : key;
					const value = obj[key];
					
					if (value !== null && value !== undefined) {
						if (typeof value === "object" && !Array.isArray(value)) {
							// Recursively flatten nested objects
							flattenObject(value, newKey, result);
						} else if (Array.isArray(value)) {
							// For arrays, stringify or flatten if array of objects
							if (value.length > 0 && typeof value[0] === "object") {
								// Array of objects - treat as nested structure
								result[newKey] = JSON.stringify(value);
							} else {
								// Array of primitives - join or stringify
								result[newKey] = JSON.stringify(value);
							}
						} else {
							// Primitive value
							result[newKey] = value;
						}
					}
				}
			}
			return result;
		};
		
		const flattened = flattenObject(jsonData);
		const columns = Object.keys(flattened);
		const statistics: Record<string, any> = {};
		const numeric_columns: string[] = [];
		const categorical_columns: string[] = [];

		for (const col of columns) {
			const value = flattened[col];
			
			if (typeof value === "number") {
				numeric_columns.push(col);
				statistics[col] = {
					type: "numeric",
					count: 1,
					mean: value,
					min: value,
					max: value,
					median: value,
					std: 0,
				};
			} else if (typeof value === "string") {
				categorical_columns.push(col);
				// Truncate very long strings for statistics
				const displayValue = value.length > 100 ? value.substring(0, 100) + "..." : value;
				statistics[col] = {
					type: "categorical",
					count: 1,
					unique: 1,
					top_values: { [displayValue]: 1 },
				};
			} else if (typeof value === "boolean") {
				categorical_columns.push(col);
				statistics[col] = {
					type: "categorical",
					count: 1,
					unique: 1,
					top_values: { [String(value)]: 1 },
				};
			}
		}

		console.log(`[JSON_ANALYZER] Flattened object: ${columns.length} keys from nested structure`);

		return {
			num_samples: 1,
			columns,
			numeric_columns,
			categorical_columns,
			statistics,
			correlations: [],
			clusters: [],
			trends: [],
			outliers: [],
		};
	}

	// FLEXIBLE: Handle primitives (string, number, boolean)
	if (typeof jsonData === "string" || typeof jsonData === "number" || typeof jsonData === "boolean") {
		return {
			num_samples: 1,
			columns: ["value"],
			numeric_columns: typeof jsonData === "number" ? ["value"] : [],
			categorical_columns: typeof jsonData === "number" ? [] : ["value"],
			statistics: {
				value: typeof jsonData === "number" ? {
					type: "numeric",
					count: 1,
					mean: jsonData,
					min: jsonData,
					max: jsonData,
					median: jsonData,
					std: 0,
				} : {
					type: "categorical",
					count: 1,
					unique: 1,
					top_values: { [String(jsonData)]: 1 },
				},
			},
			correlations: [],
			clusters: [],
			trends: [],
			outliers: [],
		};
	}

	// Ultimate fallback - return empty but valid structure
	return {
		num_samples: 0,
		columns: [],
		statistics: {},
		correlations: [],
		clusters: [],
		trends: [],
		outliers: [],
	};
}

