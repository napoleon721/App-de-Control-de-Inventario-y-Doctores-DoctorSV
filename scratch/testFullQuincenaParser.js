import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseQuincenaSpreadsheet } from "../src/utils/quincenaParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelData = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/constants/excelData.json"), "utf8"));
const doctors = excelData.doctors || [];
const staff = excelData.staff || [];
const supervisores = [
  { id: "sup-1", nombre: "EMERSON JOSUE VIGIL HERNANDEZ" },
  { id: "sup-2", nombre: "SALVADOR RENDEROS BONILLA" },
  { id: "sup-3", nombre: "ALFREDO ISAAC MARTINEZ AMAYA" },
];

// Simulate Google Sheets copy-paste with tabs and quoted cells containing newlines
const sampleTSV = `Supervisor\tsep 25, 2026\tsep 26, 2026\tsep 27, 2026
000AMB - ALFREDO ISAAC MARTINEZ AMAYA\t"IVAN FLORES RAMIREZ (4:00 PM - 10:00 PM)\nANA YOSSETTE PEREZ DE COREAS (4:00 PM - 10:00 PM)\n000KLM - ELMER CLARIBEL SAGASTUME DE GONZALEZ (4:00 PM - 10:00 PM)"\t"000RDE - ROXANA GUADALUPE CANALES RODRIGUEZ (2:00 PM - 10:00 PM)\n000KDT - JOHANNA YOSSETTE PEREZ DE COREAS (2:00 PM - 10:00 PM)"\t"000SDZ - SANTIAGO ALBERTO CONTRERAS SOTO (2:00 PM - 10:00 PM)"
000SRB - SALVADOR RENDEROS BONILLA\t"000FFF - FABRICIO JOSUE FUNES CANALES (2:00 PM - 10:00 PM)\n000RAF - RODRIGO EDUARDO ANGEL RAMOS (2:00 PM - 10:00 PM)"\t"000KSC - KAREM ESMERALDA RENDEROS DE MARQUEZ (2:00 PM - 10:00 PM)\n000ODC - OSCAR DAVID CAMPOS (2:00 PM - 10:00 PM)"\t"000FQF - FATIMA GABRIELA QUINTANILLA CALLES (2:00 PM - 10:00 PM)"
`;

console.log("Testing parseQuincenaSpreadsheet...");
const res = parseQuincenaSpreadsheet(sampleTSV, doctors, staff, supervisores);
console.log("Success:", res.success);
console.log("Stats:", res.estadisticas);
console.log("Supervisores detectados:", res.supervisoresDetectados);
console.log("Dias:", res.dias.map(d => ({ dateKey: d.dateKey, sups: Object.keys(d.porSupervisor) })));
if (res.dias[0]) {
  console.log("Detalle Dia 1 sup-3:", res.dias[0].porSupervisor["sup-3"]);
}
