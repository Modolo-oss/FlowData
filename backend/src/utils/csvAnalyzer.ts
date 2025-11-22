/**
 * CSV Analyzer for Backend
 * Analyzes CSV data and returns statistics, correlations, clusters, trends, outliers
 * Ported from Python data_analyzer.py
 */

interface Statistics {
	type: "numeric" | "categorical";
	count: number;
	mean?: number;
	min?: number;
	max?: number;
	median?: number;
	std?: number;
	unique?: number;
	top_values?: Record<string, number>;
}

export interface DataInsights {
	num_samples: number;
	columns: string[];
	numeric_columns?: string[];
	categorical_columns?: string[];
	statistics?: Record<string, Statistics>;
	correlations?: Array<{ x: string; y: string; value: number }>;
	clusters?: Array<{ x: number; y: number; cluster: string; label: string }>;
	trends?: Array<{
		metric: string;
		over: string;
		direction: string;
		change: number;
		data_points: Array<{ date: string; value: number }>;
	}>;
	outliers?: Array<{ column: string; row: number; value: number; deviation: number }>;
	// Key-value structure detection
	isKeyValueStructure?: boolean;
	keyColumn?: string | null;
	valueColumn?: string | null;
	keyValuePairs?: Array<{ key: string; value: number }>;
}

function calculateStd(values: number[]): number {
	if (values.length < 2) return 0.0;
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
	return Math.sqrt(variance);
}

function calculateCorrelation(x: number[], y: number[]): number {
	if (x.length !== y.length || x.length < 2) return 0.0;

	const meanX = x.reduce((a, b) => a + b, 0) / x.length;
	const meanY = y.reduce((a, b) => a + b, 0) / y.length;

	let numerator = 0;
	let denomX = 0;
	let denomY = 0;

	for (let i = 0; i < x.length; i++) {
		const diffX = x[i] - meanX;
		const diffY = y[i] - meanY;
		numerator += diffX * diffY;
		denomX += diffX * diffX;
		denomY += diffY * diffY;
	}

	if (denomX === 0 || denomY === 0) return 0.0;
	return numerator / (Math.sqrt(denomX) * Math.sqrt(denomY));
}

function simpleCluster(
	points: Array<{ x: number; y: number; id: number }>,
	k: number = 3
): Array<{ x: number; y: number; cluster: string; label: string }> {
	if (points.length < k) {
		return points.map((p, i) => ({
			x: p.x,
			y: p.y,
			cluster: "A",
			label: "Cluster A",
		}));
	}

	const minX = Math.min(...points.map((p) => p.x));
	const maxX = Math.max(...points.map((p) => p.x));
	const minY = Math.min(...points.map((p) => p.y));
	const maxY = Math.max(...points.map((p) => p.y));

	const centroids: Array<{ x: number; y: number }> = [];
	for (let i = 0; i < k; i++) {
		centroids.push({
			x: minX + ((maxX - minX) * (i + 1)) / (k + 1),
			y: minY + ((maxY - minY) * (i + 1)) / (k + 1),
		});
	}

	const clusters: Array<{ x: number; y: number; cluster: string; label: string }> = [];
	for (const p of points) {
		let minDist = Infinity;
		let nearest = 0;
		for (let i = 0; i < centroids.length; i++) {
			const dist = Math.sqrt(
				Math.pow(p.x - centroids[i].x, 2) + Math.pow(p.y - centroids[i].y, 2)
			);
			if (dist < minDist) {
				minDist = dist;
				nearest = i;
			}
		}
		const clusterLabel = String.fromCharCode(65 + nearest); // A, B, C, ...
		clusters.push({
			x: p.x,
			y: p.y,
			cluster: clusterLabel,
			label: `Cluster ${clusterLabel}`,
		});
	}

	return clusters;
}

function parseCSV(csvText: string): Array<Record<string, string>> {
	if (!csvText || csvText.trim().length === 0) {
		console.warn("[CSV_PARSER] Empty CSV text");
		return [];
	}

	const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
	if (lines.length < 2) {
		console.warn(`[CSV_PARSER] Not enough lines: ${lines.length} (need at least 2: header + data)`);
		return [];
	}

	// Parse header - handle quoted values
	const headerLine = lines[0];
	const headers: string[] = [];
	let currentHeader = "";
	let inQuotes = false;
	
	for (let i = 0; i < headerLine.length; i++) {
		const char = headerLine[i];
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === ',' && !inQuotes) {
			headers.push(currentHeader.trim());
			currentHeader = "";
		} else {
			currentHeader += char;
		}
	}
	headers.push(currentHeader.trim()); // Last header
	
	if (headers.length === 0 || headers.every(h => h.length === 0)) {
		console.warn("[CSV_PARSER] No valid headers found");
		return [];
	}

	const rows: Array<Record<string, string>> = [];

	// Parse data rows
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line.length === 0) continue; // Skip empty lines
		
		// Parse values - handle quoted values
		const values: string[] = [];
		let currentValue = "";
		let inQuotes = false;
		
		for (let j = 0; j < line.length; j++) {
			const char = line[j];
			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === ',' && !inQuotes) {
				values.push(currentValue.trim());
				currentValue = "";
			} else {
				currentValue += char;
			}
		}
		values.push(currentValue.trim()); // Last value
		
		// Only add row if it has at least one non-empty value
		if (values.some((v) => v && v.length > 0)) {
			const row: Record<string, string> = {};
			for (let j = 0; j < headers.length && j < values.length; j++) {
				row[headers[j]] = values[j] || "";
			}
			// Fill missing columns with empty string
			for (let j = values.length; j < headers.length; j++) {
				row[headers[j]] = "";
			}
			rows.push(row);
		}
	}

	console.log(`[CSV_PARSER] Parsed ${rows.length} rows from ${lines.length - 1} data lines`);
	return rows;
}

export function analyzeCSV(csvText: string): DataInsights {
	const rows = parseCSV(csvText);
	const num_samples = rows.length;

	if (num_samples === 0) {
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

	const columns = Object.keys(rows[0] || {});
	const statistics: Record<string, Statistics> = {};
	const numeric_columns: string[] = [];
	const categorical_columns: string[] = [];
	
	// Detect key-value structure (e.g., Metric,Value or Key,Value)
	let isKeyValueStructure = false;
	let keyColumn: string | null = null;
	let valueColumn: string | null = null;
	
	if (columns.length === 2) {
		// Check if one column is mostly categorical and one is mostly numeric
		const col1 = columns[0];
		const col2 = columns[1];
		const col1Values = rows.map(r => (r[col1] || "").trim()).filter(v => v);
		const col2Values = rows.map(r => (r[col2] || "").trim()).filter(v => v);
		
		// Check uniqueness
		const col1Unique = new Set(col1Values).size;
		const col2Unique = new Set(col2Values).size;
		
		// Check if one column has high uniqueness (likely keys) and other has numeric values
		if (col1Unique >= rows.length * 0.8 && col2Unique < rows.length * 0.5) {
			// col1 is likely key, col2 is likely value
			const col2Numeric = col2Values.filter(v => {
				const cleaned = v.replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "").replace(/ms/g, "").replace(/SOL/g, "").trim();
				return !isNaN(parseFloat(cleaned));
			}).length;
			if (col2Numeric >= col2Values.length * 0.5) {
				isKeyValueStructure = true;
				keyColumn = col1;
				valueColumn = col2;
			}
		} else if (col2Unique >= rows.length * 0.8 && col1Unique < rows.length * 0.5) {
			// col2 is likely key, col1 is likely value
			const col1Numeric = col1Values.filter(v => {
				const cleaned = v.replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "").replace(/ms/g, "").replace(/SOL/g, "").trim();
				return !isNaN(parseFloat(cleaned));
			}).length;
			if (col1Numeric >= col1Values.length * 0.5) {
				isKeyValueStructure = true;
				keyColumn = col2;
				valueColumn = col1;
			}
		}
	}

	// Analyze each column
	for (const col of columns) {
		const values = rows.map((row) => row[col] || "").filter((v) => v.trim());
		const non_empty = values.filter(
			(v) => v && v.trim().toLowerCase() !== "nan" && v.trim().toLowerCase() !== "none" && v.trim().toLowerCase() !== "null"
		);

		if (non_empty.length === 0) continue;

		// Try to parse as numeric
		const numeric_values: number[] = [];
		for (const v of non_empty) {
			try {
				const cleaned = v.replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "").trim();
				if (cleaned) {
					const numVal = parseFloat(cleaned);
					if (!isNaN(numVal)) {
						numeric_values.push(numVal);
					}
				}
			} catch {
				// Ignore
			}
		}

		// Consider numeric if at least 50% are numeric
		if (numeric_values.length >= Math.max(1, non_empty.length * 0.5)) {
			numeric_columns.push(col);
			const sorted = [...numeric_values].sort((a, b) => a - b);
			statistics[col] = {
				type: "numeric",
				count: numeric_values.length,
				mean: numeric_values.reduce((a, b) => a + b, 0) / numeric_values.length,
				min: Math.min(...numeric_values),
				max: Math.max(...numeric_values),
				median: sorted[Math.floor(sorted.length / 2)],
				std: calculateStd(numeric_values),
			};
		} else {
			categorical_columns.push(col);
			// Count top values
			const valueCounts: Record<string, number> = {};
			for (const v of non_empty) {
				valueCounts[v] = (valueCounts[v] || 0) + 1;
			}
			const topValues: Record<string, number> = {};
			const sorted = Object.entries(valueCounts)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5);
			for (const [key, count] of sorted) {
				topValues[key] = count;
			}
			statistics[col] = {
				type: "categorical",
				count: non_empty.length,
				unique: Object.keys(valueCounts).length,
				top_values: topValues,
			};
		}
	}

	// Calculate correlations
	const correlations: Array<{ x: string; y: string; value: number }> = [];
	if (numeric_columns.length >= 2) {
		for (let i = 0; i < numeric_columns.length; i++) {
			for (let j = i + 1; j < numeric_columns.length; j++) {
				const col1 = numeric_columns[i];
				const col2 = numeric_columns[j];
				const vals1: number[] = [];
				const vals2: number[] = [];

				for (const row of rows) {
					try {
						const v1_str = (row[col1] || "").trim();
						const v2_str = (row[col2] || "").trim();
						if (
							!v1_str ||
							!v2_str ||
							v1_str.toLowerCase() === "nan" ||
							v2_str.toLowerCase() === "nan"
						) {
							continue;
						}
						const v1 = parseFloat(v1_str.replace(/,/g, "").replace(/\$/g, "").replace(/%/g, ""));
						const v2 = parseFloat(v2_str.replace(/,/g, "").replace(/\$/g, "").replace(/%/g, ""));
						if (!isNaN(v1) && !isNaN(v2)) {
							vals1.push(v1);
							vals2.push(v2);
						}
					} catch {
						// Ignore
					}
				}

				if (vals1.length >= 3) {
					const corr = calculateCorrelation(vals1, vals2);
					if (!isNaN(corr) && isFinite(corr)) {
						correlations.push({
							x: col1,
							y: col2,
							value: Math.round(corr * 1000) / 1000,
						});
					}
				}
			}
		}
	}

	// Simple clustering
	let clusters: Array<{ x: number; y: number; cluster: string; label: string }> = [];
	if (numeric_columns.length >= 2) {
		const col1 = numeric_columns[0];
		const col2 = numeric_columns[1];
		const points: Array<{ x: number; y: number; id: number }> = [];

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			try {
				const v1_str = (row[col1] || "").trim();
				const v2_str = (row[col2] || "").trim();
				if (
					!v1_str ||
					!v2_str ||
					v1_str.toLowerCase() === "nan" ||
					v2_str.toLowerCase() === "nan"
				) {
					continue;
				}
				const x = parseFloat(v1_str.replace(/,/g, "").replace(/\$/g, "").replace(/%/g, ""));
				const y = parseFloat(v2_str.replace(/,/g, "").replace(/\$/g, "").replace(/%/g, ""));
				if (!isNaN(x) && !isNaN(y)) {
					points.push({ x, y, id: i });
				}
			} catch {
				// Ignore
			}
		}

		if (points.length >= 3) {
			clusters = simpleCluster(points, Math.min(3, points.length));
		}
	}

	// ✅ INTELLIGENT TREND DETECTION: Only generate trends if we have REAL time-based data
	// ❌ NO "row index" trends - itu tidak bermakna!
	const trends: Array<{
		metric: string;
		over: string;
		direction: string;
		change: number;
		data_points: Array<{ date: string; value: number }>;
	}> = [];
	
	// Try to find time-based trends first
	const time_columns = columns.filter((col) =>
		["date", "time", "at", "granted", "expires", "hour", "timestamp", "created", "updated"].some((word) =>
			col.toLowerCase().includes(word)
		)
	);

	if (time_columns.length > 0 && numeric_columns.length > 0) {
		const time_col = time_columns[0];
		const preferred_numeric = numeric_columns.filter((col) =>
			["rate", "total", "success", "amount", "cost", "time", "value", "count", "sum"].some((word) =>
				col.toLowerCase().includes(word)
			)
		);
		const numeric_col = preferred_numeric[0] || numeric_columns[0];

		const time_series: Array<{ date: string; value: number }> = [];
		for (const row of rows) {
			const time_val = (row[time_col] || "").trim();
			if (!time_val || time_val.toLowerCase() === "nan") continue;

			try {
				const num_val_str = (row[numeric_col] || "").trim();
				if (!num_val_str || num_val_str.toLowerCase() === "nan") continue;

				const num_val = parseFloat(num_val_str.replace(/,/g, "").replace(/\$/g, "").replace(/%/g, ""));
				if (isNaN(num_val)) continue;

				let date_str = time_val;
				if (time_val.includes("T")) {
					date_str = time_val.split("T")[0];
				} else if (time_val.includes(":") && time_val.length <= 10) {
					date_str = time_val; // HH:MM format
				}

				time_series.push({ date: date_str, value: num_val });
			} catch {
				// Ignore
			}
		}

		if (time_series.length >= 2) {
			const sorted_series = [...time_series].sort((a, b) => a.date.localeCompare(b.date));
			const first_val = sorted_series[0].value;
			const last_val = sorted_series[sorted_series.length - 1].value;
			const trend_direction = last_val > first_val ? "increasing" : "decreasing";
			const change =
				first_val !== 0 ? Math.round(((last_val - first_val) / first_val) * 100 * 100) / 100 : 0;

			trends.push({
				metric: numeric_col,
				over: time_col,
				direction: trend_direction,
				change,
				data_points: sorted_series.slice(0, 50), // Increased limit
			});
		}
	}
	
	// ❌ REMOVED: Jangan generate trends dari row index - itu tidak bermakna!
	// Trends hanya di-generate jika ada time-based column yang SEBENARNYA ada di data
	// Kalau tidak ada time column, jangan paksakan trends

	// Detect outliers
	const outliers: Array<{ column: string; row: number; value: number; deviation: number }> = [];
	for (const col of numeric_columns) {
		if (statistics[col] && statistics[col].type === "numeric") {
			const stats = statistics[col];
			if (stats.std && stats.std > 0 && stats.mean !== undefined) {
				const mean = stats.mean;
				const std = stats.std;
				for (let i = 0; i < Math.min(100, rows.length); i++) {
					const row = rows[i];
					try {
						const val = parseFloat(
							(row[col] || "0").replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "")
						);
						if (!isNaN(val) && Math.abs(val - mean) > 2 * std) {
							outliers.push({
								column: col,
								row: i,
								value: val,
								deviation: Math.round((Math.abs(val - mean) / std) * 100) / 100,
							});
						}
					} catch {
						// Ignore
					}
				}
			}
		}
	}

	// Generate key-value pairs if detected
	let keyValuePairs: Array<{ key: string; value: number }> = [];
	if (isKeyValueStructure && keyColumn && valueColumn) {
		for (const row of rows) {
			const key = (row[keyColumn] || "").trim();
			const valueStr = (row[valueColumn] || "").trim();
			if (key && valueStr) {
				try {
					const cleaned = valueStr.replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "").replace(/ms/g, "").replace(/SOL/g, "").trim();
					const numVal = parseFloat(cleaned);
					if (!isNaN(numVal)) {
						keyValuePairs.push({ key, value: numVal });
					}
				} catch {
					// Ignore
				}
			}
		}
	}

	return {
		num_samples,
		columns,
		numeric_columns,
		categorical_columns,
		statistics,
		correlations,
		clusters,
		trends,
		outliers: outliers.slice(0, 10), // Limit outliers
		isKeyValueStructure,
		keyColumn,
		valueColumn,
		keyValuePairs,
	};
}

