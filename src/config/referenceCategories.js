// Source labels remain on each reference record; only spelling variants are grouped.
const groups = {
  "Name Search": ["Name Search Missed", "Wrong Name Search", "incorrect name"],
  "Typing": ["Typing Requirement"],
  "Document": ["Missed Document", "missed Document", "document missin", "document missing", "document miss", "document missed", "Unverified Document", "Attachment"],
  "Document Request": ["documents request", "documet requriment", "Copies request"],
  "Wrong Document": ["worng document", "wrong documents"],
  "Attorney Opinion": ["Attorney"],
  "Pacer Search": ["parecer missed"],
  "Pacer and Patriot": [], "Patriot": [], "Vesting Name": [],
  "Comment": ["Comments", "Commet", "commet"],
  "Vendor Management Requirement": ["Vender Management Requirement", "VM Requirment", "vendor mangement requirment"],
  "Effective Date": [], "Tax / Assessor": ["TAX Error/Assessor Error", "Assessor", "PA and Taxs", "TAX Snapshot", "taxsnapshot", "tax certification", "assessed value", "assesed value"],
  "Plat Map": ["Map"], "GIS Map": [], "Chain of Title": ["Chain Missmatch", "Deed Chain"], "24 Month Chain": ["24 months chain"],
  "Cost Work Sheet": ["cost worksheet"], "HOA": ["HOA Name", "HOA Comment", "HOA Comments"], "PUD Comment": ["PUD Name"],
  "Parcel ID": [], "Parcel Search": [], "Legal Description": [],
  "Property Report": ["property view report", "propery view reprot", "Property View Report"],
  "Search Package": ["Package", "Incorrect Search Package"],
  "Address": ["address discripency", "property address", "City Discripency", "zip code"],
  "Property Identification": ["wrong property search"], "Mailing List": [], "Abstractor": [], "Update Report": [],
  "Lien Registry": ["Lien registory"], "Court Search": ["Protho Search", "Protho"],
  "County Change": ["county changed"], "Wrong Order Number": [], "Unofficial Copies": [],
  "Index": ["GI Index Document", "General Index Document", "PI Index Document", "Property Index Document", "Index Missing", "index missed"],
  "Water Mark Copies": ["Water Mark"], "Recording Date": [], "Judgment": ["judgment search", "Judgements", "Judgment & Lien search"],
  "Lender Name": [], "Assignment Chain": ["assingment chain", "assingment"],
  "Mortgage": ["no Open mortage", "no open mortgage"], "Survey": [], "Torrens": ["Torrens Certificate"],
  "Cover Sheet": ["coversheet"], "Marital Status": ["maritial status"], "Tax Warrant": [], "Sunbiz": [],
  "No Revision Request": ["NO Revision request", "no revision comment"], "Checklist": ["Check List"],
  "Probate Copy": [], "Page Sequence": [], "THR Report": ["THR Reprot"], "Date Discrepancy": ["Date Discripency"],
  "Search Note": [], "Effective Date / Typing": ["Effective Date/Typing Requirement"],
  "Abstractor / Typing": ["abstractor/typing requerment"], "Uncategorized": [""]
};
const key = value => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const aliases = new Map(Object.entries(groups).flatMap(([name, values]) => [name, ...values].map(value => [key(value), name])));
export const REFERENCE_CATEGORIES = Object.keys(groups);
export const normalizeCategory = value => aliases.get(key(value)) || "Uncategorized";
export const isReferenceCategory = value => REFERENCE_CATEGORIES.includes(value);

// Supplement the existing issue mappings only when the named category needs it.
export const CATEGORY_DOCUMENTS = {
  "Cost Work Sheet": ["COST_WORKSHEET"], "Index": ["INDEX"], "THR Report": ["THR"],
  "Pacer Search": ["PACER"], "Patriot": ["PATRIOT"], "Pacer and Patriot": ["PACER", "PATRIOT"],
  "Plat Map": ["MAP"], "GIS Map": ["MAP"], "Tax / Assessor": ["TAX", "PA"]
};
