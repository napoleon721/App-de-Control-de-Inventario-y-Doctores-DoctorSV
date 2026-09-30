import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelData = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/constants/excelData.json"), "utf8"));
const doctors = excelData.doctors || [];

// Create lookup maps
const byToken = new Map();
const byNormName = new Map();

function norm(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

doctors.forEach(d => {
  if (d.tcaUsuario) byToken.set(d.tcaUsuario.toUpperCase().trim(), d);
  if (d.nombre) byNormName.set(norm(d.nombre), d);
});

console.log(`Loaded ${doctors.length} doctors, ${byToken.size} tokens in lookup.`);

const sampleLines = [
  "000FFF - FABRICIO JOSUE FUNES CANALES (2:00 PM - 10:00 PM)",
  "000RAF - RODRIGO EDUARDO ANGEL RAMOS (2:00 PM - 10:00 PM)",
  "000KSC - KAREM ESMERALDA RENDEROS DE MARQUEZ (2:00 PM - 10:00 PM)",
  "000ODC - OSCAR DAVID CAMPOS (2:00 PM - 10:00 PM)",
  "000FQF - FATIMA GABRIELA QUINTANILLA CALLES (2:00 PM - 10:00 PM)",
  "000JSZ - JOSE SALVADOR REYES SORTO (2:00 PM - 10:00 PM)",
  "000RTL - RITA MARIELA SORTO SERPAS (2:00 PM - 10:00 PM)",
  "000FPA - FABRICIO ERNESTO REYES VARGAS (2:00 PM - 10:00 PM)",
  "000RDE - ROXANA GUADALUPE CANALES RODRIGUEZ (2:00 PM - 10:00 PM)",
  "000KDT - JOHANNA YOSSETTE PEREZ DE COREAS (2:00 PM - 10:00 PM)",
  "000MXV - MARIA RENEE BARRERA RODRIGUEZ (2:00 PM - 10:00 PM)",
  "000SDZ - SANTIAGO ALBERTO CONTRERAS SOTO (2:00 PM - 10:00 PM)",
  "000STA - SANTOS BLADIMIR CHAVEZ CASTILLO (2:00 PM - 10:00 PM)",
  "000KJB - KAREN YAMILETH TREJO MEDINA (2:00 PM - 10:00 PM)",
  "000BVA - BLANCA ALICIA VELIZ VASQUEZ (2:00 PM - 10:00 PM)",
  "000DZY - DIANA CAROLINA HERNANDEZ (2:00 PM - 10:00 PM)",
  "000SY - DIEGO BENJAMIN RETANA FLORES (2:00 PM - 10:00 PM)",
  "000MY1 - MERCEDES JOSUE AMAYA SARMIENTO (2:00 PM - 10:00 PM)",
  "000RCR - RICARDO CHICAS CHICAS (2:00 PM - 10:00 PM)",
  "000KAE - EMERSON NOE ROMERO AVALOS (2:00 PM - 10:00 PM)",
  "000AYY - AUGUSTO JOSE CASTILLO PERDOMO (2:00 PM - 10:00 PM)",
  "000KMY - KARLA MARICRUZ GONZALEZ MARQUEZ (2:00 PM - 10:00 PM)",
  "000WOS - WILMER OMAR OTERO SORTO (2:00 PM - 10:00 PM)",
  "000NFA - NEHEMIAS EZEQUIEL FRANCO ARGUETA (2:00 PM - 10:00 PM)",
  "000RTR - ROBERTO CARLOS RENDEROS PINEDA (2:00 PM - 10:00 PM)",
  "000GLS - GLENDA MARICELA LUNA FLORES (2:00 PM - 10:00 PM)",
  "000KUS - KRISSIA ELIZABETH RAMOS RODAS (2:00 PM - 10:00 PM)",
  "000LSP - LILIANA BEATRIZ REYES SORTO (2:00 PM - 10:00 PM)",
  "000CO4 - CARLOS ISAAC QUINTANILLA PORTILLO (2:00 PM - 10:00 PM)",
  "000MVR - MARLON OSWALDO QUINTEROS RENDEROS (2:00 PM - 10:00 PM)",
  "000SLT - SAIRA MARIELA LAINEZ TORRES (2:00 PM - 10:00 PM)",
  "000RCW - RICARDO DANIEL CHICAS CHICAS (2:00 PM - 10:00 PM)",
  "000MAR - MIGUEL ANTONIO AVILES GARCIA (2:00 PM - 10:00 PM)",
  "000CNZ - CARLOS LUIS MELENDEZ MALDONADO (2:00 PM - 10:00 PM)",
  "000EMS - ESTEFANY IVETH MEJIA SAGASTIZADO (2:00 PM - 10:00 PM)",
  "000EAZ - ELMER ALEXANDER ANDRADE GALVEZ (2:00 PM - 10:00 PM)",
  "000RHZ - RODRIGO JOSUE GUZMAN ROSALES (2:00 PM - 10:00 PM)",
  "000JIR - JONATHAN EDGARDO GARCIA LOPEZ (2:00 PM - 10:00 PM)",
  "000KOW - JOSUE GONZALO BENAVIDES HERNANDEZ (2:00 PM - 10:00 PM)",
  "000QG - OSCAR MIGUEL QUINTEROS GUEVARA (2:00 PM - 10:00 PM)",
  "000JZT - JUAN JOSE BUSTILLO TREMINIO (2:00 PM - 10:00 PM)",
  "000YLZ - YASMIN ENEIDA LOPEZ MORENO (2:00 PM - 10:00 PM)"
];

let matched = 0;
for (const line of sampleLines) {
  // Regex: code - Name (shift)
  const m = line.match(/^(?:([A-Za-z0-9_-]{2,10})\s*[-–]\s*)?([^(]+)(?:\(([^)]+)\))?/);
  if (m) {
    const code = m[1]?.trim();
    const name = m[2]?.trim();
    const shift = m[3]?.trim();
    
    let match = null;
    let matchType = "";
    if (code && byToken.has(code.toUpperCase())) {
      match = byToken.get(code.toUpperCase());
      matchType = "TOKEN (" + code + ")";
    } else if (name && byNormName.has(norm(name))) {
      match = byNormName.get(norm(name));
      matchType = "NAME (" + name + ")";
    } else {
      // Try fuzzy or partial
      const n = norm(name);
      for (const [key, d] of byNormName.entries()) {
        if (n.length >= 10 && (key.includes(n) || n.includes(key))) {
          match = d;
          matchType = "FUZZY (" + d.nombre + ")";
          break;
        }
      }
    }

    if (match) {
      matched++;
      console.log(`[OK] Line: "${code || ''} - ${name}" -> Found: "${match.nombre}" by ${matchType}, Shift: ${shift}`);
    } else {
      console.log(`[FAIL] Not found: "${line}" (code: ${code}, name: ${name})`);
    }
  }
}
console.log(`\nResult: ${matched} / ${sampleLines.length} matched.`);
