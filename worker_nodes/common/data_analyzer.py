"""
Data Analyzer for CSV shards
Analyzes original CSV data and returns statistics, correlations, clusters, trends
"""
import csv
import io
import json
from typing import Dict, List, Any, Optional
from collections import Counter
import hashlib

def analyze_csv_shard(csv_text: str) -> Dict[str, Any]:
	"""
	Analyze CSV shard and return data insights (statistics, correlations, clusters, trends)
	"""
	lines = [l.strip() for l in csv_text.splitlines() if l.strip()]
	if len(lines) < 2:
		return {
			"num_samples": 0,
			"columns": [],
			"statistics": {},
			"correlations": [],
			"clusters": [],
			"trends": [],
			"outliers": [],
		}
	
	# Parse CSV - handle empty cells and multiple categories
	reader = csv.DictReader(io.StringIO(csv_text))
	rows = []
	for row in reader:
		# Filter out completely empty rows
		if any(str(v).strip() for v in row.values() if v):
			rows.append(row)
	
	num_samples = len(rows)
	
	if num_samples == 0:
		return {
			"num_samples": 0,
			"columns": [],
			"statistics": {},
			"correlations": [],
			"clusters": [],
			"trends": [],
			"outliers": [],
		}
	
	# Get column names
	columns = list(rows[0].keys()) if rows else []
	
	# Analyze each column
	statistics: Dict[str, Any] = {}
	correlations: List[Dict[str, Any]] = []
	numeric_columns: List[str] = []
	categorical_columns: List[str] = []
	
	for col in columns:
		values = [row.get(col, "") for row in rows if col in row]
		non_empty = [v for v in values if v and str(v).strip() and str(v).strip().lower() not in ["", "nan", "none", "null"]]
		
		if not non_empty:
			continue
		
		# Try to parse as numeric (handle percentages, commas, etc.)
		numeric_values = []
		for v in non_empty:
			try:
				# Clean value: remove %, $, commas, whitespace
				cleaned = str(v).replace(",", "").replace("$", "").replace("%", "").strip()
				if cleaned:
					num_val = float(cleaned)
					numeric_values.append(num_val)
			except (ValueError, AttributeError, TypeError):
				pass
		
		# Consider column numeric if at least 50% of non-empty values are numeric (more lenient)
		if len(numeric_values) >= max(1, len(non_empty) * 0.5):  # 50% numeric threshold
			numeric_columns.append(col)
			sorted_vals = sorted(numeric_values)
			statistics[col] = {
				"type": "numeric",
				"count": len(numeric_values),
				"mean": sum(numeric_values) / len(numeric_values) if numeric_values else 0,
				"min": min(numeric_values) if numeric_values else 0,
				"max": max(numeric_values) if numeric_values else 0,
				"median": sorted_vals[len(sorted_vals) // 2] if sorted_vals else 0,
				"std": calculate_std(numeric_values) if len(numeric_values) > 1 else 0,
			}
		else:
			categorical_columns.append(col)
			value_counts = Counter(non_empty)
			statistics[col] = {
				"type": "categorical",
				"count": len(non_empty),
				"unique": len(value_counts),
				"top_values": dict(value_counts.most_common(5)),
			}
	
	# Calculate correlations between numeric columns
	if len(numeric_columns) >= 2:
		for i, col1 in enumerate(numeric_columns):
			for col2 in numeric_columns[i + 1:]:
				vals1 = []
				vals2 = []
				for row in rows:
					try:
						v1_str = str(row.get(col1, "")).strip()
						v2_str = str(row.get(col2, "")).strip()
						
						# Skip if empty
						if not v1_str or not v2_str or v1_str.lower() in ["", "nan", "none", "null"] or v2_str.lower() in ["", "nan", "none", "null"]:
							continue
						
						v1 = float(v1_str.replace(",", "").replace("$", "").replace("%", ""))
						v2 = float(v2_str.replace(",", "").replace("$", "").replace("%", ""))
						vals1.append(v1)
						vals2.append(v2)
					except (ValueError, AttributeError, TypeError):
						continue
				
				if len(vals1) >= 3:  # Need at least 3 points for correlation
					corr = calculate_correlation(vals1, vals2)
					if not (corr is None or (isinstance(corr, float) and (corr != corr))):  # Check for NaN
						correlations.append({
							"x": col1,
							"y": col2,
							"value": round(corr, 3),
						})
	
	# Simple clustering (based on numeric columns)
	clusters: List[Dict[str, Any]] = []
	if len(numeric_columns) >= 2:
		# Use first two numeric columns for 2D clustering
		col1, col2 = numeric_columns[0], numeric_columns[1]
		points = []
		for row in rows:
			try:
				v1_str = str(row.get(col1, "")).strip()
				v2_str = str(row.get(col2, "")).strip()
				
				# Skip if empty
				if not v1_str or not v2_str or v1_str.lower() in ["", "nan", "none", "null"] or v2_str.lower() in ["", "nan", "none", "null"]:
					continue
				
				x = float(v1_str.replace(",", "").replace("$", "").replace("%", ""))
				y = float(v2_str.replace(",", "").replace("$", "").replace("%", ""))
				points.append({"x": x, "y": y, "id": len(points)})
			except (ValueError, AttributeError, TypeError):
				continue
		
		if len(points) >= 3:
			# Simple k-means-like clustering (3 clusters)
			clusters = simple_cluster(points, k=min(3, len(points)))
	
	# Detect trends (if time-based column exists)
	trends: List[Dict[str, Any]] = []
	time_columns = [col for col in columns if any(time_word in col.lower() for time_word in ["date", "time", "at", "granted", "expires", "hour", "timestamp"])]
	
	if time_columns and numeric_columns:
		# Try to find trend over time
		time_col = time_columns[0]
		# Try to find a good numeric column for trend (prefer success_rate, total_transactions, etc.)
		preferred_numeric = [col for col in numeric_columns if any(word in col.lower() for word in ["rate", "total", "success", "amount", "cost", "time"])]
		numeric_col = preferred_numeric[0] if preferred_numeric else numeric_columns[0]
		
		time_series = []
		for row in rows:
			time_val = str(row.get(time_col, "")).strip()
			if not time_val or time_val.lower() in ["", "nan", "none", "null"]:
				continue
			
			try:
				num_val_str = str(row.get(numeric_col, "")).strip()
				if not num_val_str or num_val_str.lower() in ["", "nan", "none", "null"]:
					continue
				
				num_val = float(num_val_str.replace(",", "").replace("$", "").replace("%", ""))
				
				# Handle different time formats
				if "T" in time_val:
					date_part = time_val.split("T")[0]
					time_series.append({"date": date_part, "value": num_val})
				elif ":" in time_val and len(time_val) <= 10:  # HH:MM format
					time_series.append({"date": time_val, "value": num_val})
				else:
					time_series.append({"date": time_val, "value": num_val})
			except (ValueError, AttributeError, TypeError):
				continue
		
		if len(time_series) >= 2:
			# Simple trend detection (increasing/decreasing)
			# Sort by date/time
			try:
				sorted_series = sorted(time_series, key=lambda x: x["date"])
			except:
				sorted_series = time_series
			
			if len(sorted_series) >= 2:
				first_val = sorted_series[0]["value"]
				last_val = sorted_series[-1]["value"]
				trend_direction = "increasing" if last_val > first_val else "decreasing"
				trends.append({
					"metric": numeric_col,
					"over": time_col,
					"direction": trend_direction,
					"change": round(((last_val - first_val) / first_val * 100) if first_val != 0 else 0, 2),
					"data_points": sorted_series[:20],  # Limit to 20 points
				})
	
	# Detect outliers (for numeric columns)
	outliers: List[Dict[str, Any]] = []
	for col in numeric_columns:
		if col in statistics:
			stats = statistics[col]
			if stats["std"] > 0:
				mean = stats["mean"]
				std = stats["std"]
				for i, row in enumerate(rows[:100]):  # Check first 100 rows
					try:
						val = float(str(row.get(col, "0")).replace(",", "").replace("$", "").replace("%", ""))
						# Outlier if > 2 standard deviations from mean
						if abs(val - mean) > 2 * std:
							outliers.append({
								"column": col,
								"row": i,
								"value": val,
								"deviation": round(abs(val - mean) / std, 2),
							})
					except (ValueError, AttributeError):
						continue
	
	return {
		"num_samples": num_samples,
		"columns": columns,
		"numeric_columns": numeric_columns,
		"categorical_columns": categorical_columns,
		"statistics": statistics,
		"correlations": correlations,
		"clusters": clusters,
		"trends": trends,
		"outliers": outliers[:10],  # Limit outliers
	}

def calculate_std(values: List[float]) -> float:
	"""Calculate standard deviation"""
	if len(values) < 2:
		return 0.0
	mean = sum(values) / len(values)
	variance = sum((x - mean) ** 2 for x in values) / len(values)
	return variance ** 0.5

def calculate_correlation(x: List[float], y: List[float]) -> float:
	"""Calculate Pearson correlation coefficient"""
	if len(x) != len(y) or len(x) < 2:
		return 0.0
	
	mean_x = sum(x) / len(x)
	mean_y = sum(y) / len(y)
	
	numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(len(x)))
	denom_x = sum((x[i] - mean_x) ** 2 for i in range(len(x)))
	denom_y = sum((y[i] - mean_y) ** 2 for i in range(len(x)))
	
	if denom_x == 0 or denom_y == 0:
		return 0.0
	
	return numerator / ((denom_x ** 0.5) * (denom_y ** 0.5))

def simple_cluster(points: List[Dict[str, Any]], k: int = 3) -> List[Dict[str, Any]]:
	"""Simple k-means clustering (2D points)"""
	if len(points) < k:
		return [{"x": p["x"], "y": p["y"], "cluster": "A", "label": "Cluster A"} for p in points]
	
	# Initialize centroids
	min_x = min(p["x"] for p in points)
	max_x = max(p["x"] for p in points)
	min_y = min(p["y"] for p in points)
	max_y = max(p["y"] for p in points)
	
	centroids = []
	for i in range(k):
		centroids.append({
			"x": min_x + (max_x - min_x) * (i + 1) / (k + 1),
			"y": min_y + (max_y - min_y) * (i + 1) / (k + 1),
		})
	
	# Assign points to nearest centroid
	clusters = []
	for p in points:
		min_dist = float("inf")
		nearest = 0
		for i, centroid in enumerate(centroids):
			dist = ((p["x"] - centroid["x"]) ** 2 + (p["y"] - centroid["y"]) ** 2) ** 0.5
			if dist < min_dist:
				min_dist = dist
				nearest = i
		
		cluster_label = chr(ord("A") + nearest)
		clusters.append({
			"x": p["x"],
			"y": p["y"],
			"cluster": cluster_label,
			"label": f"Cluster {cluster_label}",
		})
	
	return clusters

