#!/usr/bin/env node

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// Create workbook
const wb = XLSX.utils.book_new();

// ========================================
// Sheet 1: Template
// ========================================
const headers = [
  "Site",
  "Blog Title",
  "Live URL",
  "Writer",
  "Publisher",
  "Draft Doc Link",
  "Display Publish Date",
  "Actual Publish Date",
];

const helperRow = [
  "SH or RED",
  "Full blog title",
  "Full published blog URL",
  "Blog writer name",
  "Person who published",
  "Google Doc / writing link",
  "Date shown on blog (YYYY-MM-DD)",
  "Internal publish date (YYYY-MM-DD)",
];

const exampleRows = [
  [
    "RED",
    "Why Do People Blur License Plates in Video?",
    "https://www.redactor.com/blog/redaction-tools-why-blur-out-license-plates-in-video",
    "Haris",
    "Roger",
    "https://docs.google.com/document/d/example",
    "2024-04-12",
    "2024-04-11",
  ],
  [
    "SH",
    "Vehicle Recognition for Parking Enforcement",
    "https://www.sighthound.com/blog/vehicle-recognition-parking-enforcement",
    "Haris",
    "Roger",
    "https://docs.google.com/document/d/example2",
    "2024-05-21",
    "2024-05-20",
  ],
  [
    "RED",
    "Best Practices for Redacting Body Camera Footage",
    "https://www.redactor.com/blog/body-camera-redaction-best-practices",
    "Haris",
    "Roger",
    "https://docs.google.com/document/d/example3",
    "2024-06-03",
    "2024-06-02",
  ],
];

const templateData = [headers, helperRow, ...exampleRows];
const templateWs = XLSX.utils.aoa_to_sheet(templateData);

// Set column widths
const columnWidths = [
  { wch: 12 },  // Site
  { wch: 40 },  // Blog Title
  { wch: 60 },  // Live URL
  { wch: 18 },  // Writer
  { wch: 18 },  // Publisher
  { wch: 35 },  // Draft Doc Link
  { wch: 20 },  // Display Publish Date
  { wch: 20 }, // Actual Publish Date
];
templateWs["!cols"] = columnWidths;

// Freeze first row
templateWs["!freeze"] = { xSplit: 0, ySplit: 1 };

// Style header row (bold + gray background)
const headerStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "366092" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  },
};

// Apply header styling
for (let i = 0; i < headers.length; i++) {
  const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
  templateWs[cellRef].s = headerStyle;
}

// Add data validation for Site column (dropdown: SH, RED)
templateWs.dataValidations = templateWs.dataValidations || [];
templateWs.dataValidations.push({
  type: "list",
  formula1: '"SH,RED"',
  sqref: `A3:A1000`, // Apply to data rows only (skip header and helper)
  showInputMessage: true,
  promptTitle: "Site Selection",
  prompt: "Select SH or RED",
});

// Add data validation for URL columns (must start with https://)
const urlColumns = ["C", "F"]; // Live URL and Draft Doc Link
urlColumns.forEach((col) => {
  templateWs.dataValidations.push({
    type: "custom",
    formula1: `OR(${col}3="",LEFT(${col}3,8)="https://")`,
    sqref: `${col}3:${col}1000`,
    showInputMessage: true,
    promptTitle: "URL Format",
    prompt: "URL must start with https:// or be empty",
    showErrorMessage: true,
    errorTitle: "Invalid URL",
    error: "URLs must start with https://",
  });
});

// Add date validation for date columns (YYYY-MM-DD format)
const dateColumns = ["G", "H"]; // Display Publish Date, Actual Publish Date
dateColumns.forEach((col) => {
  templateWs.dataValidations.push({
    type: "date",
    operator: "greaterThan",
    formula1: "1900-01-01",
    sqref: `${col}3:${col}1000`,
    showInputMessage: true,
    promptTitle: "Date Format",
    prompt: "Enter date in YYYY-MM-DD format",
  });
});

XLSX.utils.book_append_sheet(wb, templateWs, "Template");

// ========================================
// Sheet 2: Instructions
// ========================================
const instructionsData = [
  ["Blog Import Template Instructions"],
  [],
  ["Column Guide:"],
  ["Site", "Enter SH or RED only"],
  ["Blog Title", "Full title of the blog post"],
  ["Live URL", "Full published URL (must start with https://)"],
  ["Writer", "Name of the person who wrote the blog"],
  ["Publisher", "Name of the person who published the blog"],
  ["Draft Doc Link", "Link to Google Doc or writing document (optional, but must start with https:// if provided)"],
  ["Display Publish Date", "Date shown on the blog in YYYY-MM-DD format"],
  ["Actual Publish Date", "Internal publish date in YYYY-MM-DD format"],
  [],
  ["Important Notes:"],
  ["• Do not modify column headers"],
  ["• Duplicate blogs are detected using the Live URL"],
  ["• Existing blogs with the same Live URL will be updated"],
  ["• New blogs will be created for URLs not found in the system"],
  ["• All date fields must use YYYY-MM-DD format"],
  ["• Writer and Publisher names are case-insensitive"],
  ["• New writer/publisher accounts will be auto-created if they don't exist"],
  [],
  ["Example:"],
  ["For a Sighthound blog about vehicle recognition:"],
  ["SH", "Vehicle Recognition for Parking Enforcement", "https://www.sighthound.com/blog/vehicle-recognition-parking-enforcement", "John Smith", "Jane Doe", "https://docs.google.com/document/d/abc123", "2024-05-21", "2024-05-20"],
];

const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
instructionsWs["!cols"] = [{ wch: 40 }, { wch: 60 }];

// Style title
instructionsWs["A1"].s = {
  font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "366092" } },
  alignment: { horizontal: "left", vertical: "center" },
};

XLSX.utils.book_append_sheet(wb, instructionsWs, "Instructions");

// ========================================
// Write file
// ========================================
const outputDir = path.join(__dirname, "../public/templates");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, "blog-import-template.xlsx");
XLSX.writeFile(wb, outputPath);

console.log(`✅ Blog import template XLSX generated: ${outputPath}`);
