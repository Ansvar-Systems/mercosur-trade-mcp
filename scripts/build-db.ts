#!/usr/bin/env tsx
/**
 * Build the Mercosur Trade MCP SQLite database.
 *
 * Usage: tsx scripts/build-db.ts
 *
 * Creates data/database.db with the full schema, populates from seed data
 * (when available), rebuilds FTS indexes, and sets journal mode to DELETE
 * for WASM compatibility on Vercel.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync, unlinkSync, statSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'database.db');

// ── Ensure data directory exists ─────────────────────────────────────────

const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// ── Remove existing database ─────────────────────────────────────────────

if (existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
}

console.log('Building Mercosur Trade MCP database...\n');

const db = new Database(DB_PATH);

// ── Schema ───────────────────────────────────────────────────────────────

db.exec(`
  -- Metadata
  CREATE TABLE IF NOT EXISTS db_metadata (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Trade blocs
  CREATE TABLE trade_blocs (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    full_name           TEXT,
    founded_year        INTEGER,
    website             TEXT,
    member_countries    TEXT NOT NULL,
    associate_countries TEXT
  );

  -- Agreements (treaties, protocols, decisions)
  CREATE TABLE agreements (
    id              TEXT PRIMARY KEY,
    bloc_id         TEXT REFERENCES trade_blocs(id),
    title           TEXT NOT NULL,
    official_name   TEXT,
    year            INTEGER,
    agreement_type  TEXT,
    parties         TEXT NOT NULL,
    status          TEXT DEFAULT 'in_force',
    source_url      TEXT,
    last_updated    TEXT
  );

  -- Provisions (article-level content)
  CREATE TABLE provisions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    agreement_id  TEXT NOT NULL REFERENCES agreements(id),
    article_ref   TEXT NOT NULL,
    title         TEXT,
    content       TEXT NOT NULL,
    chapter       TEXT,
    topic         TEXT,
    UNIQUE(agreement_id, article_ref)
  );

  -- Full-text search on provisions
  CREATE VIRTUAL TABLE provisions_fts USING fts5(
    content, title, article_ref,
    content='provisions', content_rowid='id'
  );

  -- FTS triggers for auto-sync
  CREATE TRIGGER provisions_ai AFTER INSERT ON provisions BEGIN
    INSERT INTO provisions_fts(rowid, content, title, article_ref)
    VALUES (new.id, new.content, new.title, new.article_ref);
  END;

  CREATE TRIGGER provisions_ad AFTER DELETE ON provisions BEGIN
    INSERT INTO provisions_fts(provisions_fts, rowid, content, title, article_ref)
    VALUES ('delete', old.id, old.content, old.title, old.article_ref);
  END;

  CREATE TRIGGER provisions_au AFTER UPDATE ON provisions BEGIN
    INSERT INTO provisions_fts(provisions_fts, rowid, content, title, article_ref)
    VALUES ('delete', old.id, old.content, old.title, old.article_ref);
    INSERT INTO provisions_fts(rowid, content, title, article_ref)
    VALUES (new.id, new.content, new.title, new.article_ref);
  END;

  -- Data transfer rules (bilateral)
  CREATE TABLE data_transfer_rules (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source_country      TEXT NOT NULL,
    dest_country        TEXT NOT NULL,
    framework           TEXT,
    adequacy_status     TEXT,
    transfer_mechanisms TEXT,
    restrictions        TEXT,
    legal_basis         TEXT,
    UNIQUE(source_country, dest_country)
  );

  -- Mutual recognition agreements
  CREATE TABLE mutual_recognition (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    country_a     TEXT NOT NULL,
    country_b     TEXT NOT NULL,
    domain        TEXT NOT NULL,
    agreement_id  TEXT REFERENCES agreements(id),
    description   TEXT,
    status        TEXT DEFAULT 'active'
  );

  -- Digital trade obligations
  CREATE TABLE digital_trade_obligations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    agreement_id  TEXT REFERENCES agreements(id),
    countries     TEXT NOT NULL,
    obligation    TEXT NOT NULL,
    chapter       TEXT,
    description   TEXT,
    legal_basis   TEXT
  );

  -- Data sources
  CREATE TABLE sources (
    id            TEXT PRIMARY KEY,
    full_name     TEXT NOT NULL,
    authority     TEXT,
    jurisdiction  TEXT,
    source_url    TEXT,
    last_fetched  TEXT,
    last_updated  TEXT,
    item_count    INTEGER DEFAULT 0
  );

  -- Indexes
  CREATE INDEX idx_agreements_bloc ON agreements(bloc_id);
  CREATE INDEX idx_provisions_agreement ON provisions(agreement_id);
  CREATE INDEX idx_provisions_topic ON provisions(topic);
  CREATE INDEX idx_transfer_rules_pair ON data_transfer_rules(source_country, dest_country);
  CREATE INDEX idx_mutual_rec_pair ON mutual_recognition(country_a, country_b);
  CREATE INDEX idx_digital_obligations_agreement ON digital_trade_obligations(agreement_id);
`);

console.log('Schema created.');

// ── Seed: trade blocs ────────────────────────────────────────────────────

const insertBloc = db.prepare(`
  INSERT INTO trade_blocs (id, name, full_name, founded_year, website, member_countries, associate_countries)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

insertBloc.run(
  'mercosur',
  'Mercosur',
  'Mercado Comun del Sur (Southern Common Market)',
  1991,
  'https://www.mercosur.int',
  'BR,AR,UY,PY',
  'CL,CO,EC,PE,GY,SR',
);

insertBloc.run(
  'pacific_alliance',
  'Pacific Alliance',
  'Alianza del Pacifico',
  2012,
  'https://alianzapacifico.net',
  'CL,CO,MX,PE',
  null,
);

insertBloc.run(
  'prosur',
  'PROSUR',
  'Forum for the Progress and Development of South America',
  2019,
  'https://prosuramerica.org',
  'AR,BR,CL,CO,EC,GY,PE,PY,SR,UY',
  null,
);

console.log('Trade blocs seeded.');

// ── Seed: data sources ───────────────────────────────────────────────────

const insertSource = db.prepare(`
  INSERT INTO sources (id, full_name, authority, jurisdiction, source_url, last_fetched, last_updated, item_count)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const today = new Date().toISOString().slice(0, 10);

insertSource.run(
  'mercosur-secretariat',
  'Mercosur Secretariat',
  'Mercosur Administrative Secretariat',
  'Mercosur',
  'https://www.mercosur.int',
  today,
  today,
  0,
);

insertSource.run(
  'pacific-alliance-portal',
  'Pacific Alliance Official Portal',
  'Pacific Alliance Secretariat',
  'Pacific Alliance',
  'https://alianzapacifico.net',
  today,
  today,
  0,
);

insertSource.run(
  'prosur-portal',
  'PROSUR Official Portal',
  'PROSUR Presidency',
  'PROSUR',
  'https://prosuramerica.org',
  today,
  today,
  0,
);

insertSource.run(
  'bilateral-agreements',
  'Bilateral Trade Agreements',
  'Various national trade ministries',
  'LATAM',
  null,
  today,
  today,
  0,
);

console.log('Sources seeded.');

// ── Seed: agreements ─────────────────────────────────────────────────

const insertAgreement = db.prepare(`
  INSERT INTO agreements (id, bloc_id, title, official_name, year, agreement_type, parties, status, source_url, last_updated)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertAgreement.run(
  'treaty-of-asuncion',
  'mercosur',
  'Treaty of Asuncion',
  'Tratado para la Constitucion de un Mercado Comun entre la Republica Argentina, la Republica Federativa del Brasil, la Republica del Paraguay y la Republica Oriental del Uruguay',
  1991,
  'founding_treaty',
  'BR,AR,UY,PY',
  'in_force',
  'https://www.mercosur.int/documentos-y-normativa/tratados/',
  today,
);

insertAgreement.run(
  'protocol-ouro-preto',
  'mercosur',
  'Protocol of Ouro Preto',
  'Protocolo Adicional al Tratado de Asuncion sobre la Estructura Institucional del MERCOSUR (Protocolo de Ouro Preto)',
  1994,
  'protocol',
  'BR,AR,UY,PY',
  'in_force',
  'https://www.mercosur.int/documentos-y-normativa/tratados/',
  today,
);

insertAgreement.run(
  'mercosur-digital-agenda',
  'mercosur',
  'Mercosur Digital Agenda (CMC Decision 13/15)',
  'Decision CMC No. 13/15 - Agenda Digital del MERCOSUR',
  2015,
  'decision',
  'BR,AR,UY,PY',
  'in_force',
  'https://normas.mercosur.int/simfiles/normativas/DEC_013-2015_ES_Agenda%20Digital.pdf',
  today,
);

insertAgreement.run(
  'mercosur-e-commerce',
  'mercosur',
  'Mercosur Agreement on Electronic Commerce',
  'Acuerdo sobre Comercio Electronico del MERCOSUR',
  2021,
  'agreement',
  'BR,AR,UY,PY',
  'in_force',
  'https://normas.mercosur.int/',
  today,
);

insertAgreement.run(
  'mercosur-data-protection',
  'mercosur',
  'Mercosur Data Protection Agreement',
  'Acuerdo del MERCOSUR sobre Proteccion de Datos Personales',
  2021,
  'agreement',
  'BR,AR,UY,PY',
  'in_force',
  'https://normas.mercosur.int/',
  today,
);

insertAgreement.run(
  'pa-additional-protocol',
  'pacific_alliance',
  'Pacific Alliance Additional Protocol',
  'Protocolo Adicional al Acuerdo Marco de la Alianza del Pacifico',
  2014,
  'protocol',
  'CL,CO,MX,PE',
  'in_force',
  'https://alianzapacifico.net/documentos/',
  today,
);

insertAgreement.run(
  'pa-digital-agenda',
  'pacific_alliance',
  'Pacific Alliance Digital Agenda',
  'Hoja de Ruta de la Agenda Digital de la Alianza del Pacifico',
  2016,
  'roadmap',
  'CL,CO,MX,PE',
  'in_force',
  'https://alianzapacifico.net/documentos/',
  today,
);

insertAgreement.run(
  'prosur-digital-declaration',
  'prosur',
  'PROSUR Declaration on Digital Economy',
  'Declaracion de PROSUR sobre Economia Digital',
  2019,
  'declaration',
  'AR,BR,CL,CO,EC,GY,PE,PY,SR,UY',
  'in_force',
  'https://prosuramerica.org',
  today,
);

insertAgreement.run(
  'mercosur-eu-association',
  'mercosur',
  'Mercosur-EU Association Agreement',
  'Acuerdo de Asociacion Mercosur-Union Europea',
  2019,
  'association_agreement',
  'BR,AR,UY,PY,EU',
  'pending_ratification',
  'https://policy.trade.ec.europa.eu/eu-trade-relationships-country-and-region/countries-and-regions/mercosur_en',
  today,
);

insertAgreement.run(
  'ace-35-mercosur-chile',
  'mercosur',
  'ACE 35 — Mercosur-Chile Economic Complementation Agreement',
  'Acuerdo de Complementacion Economica No. 35 entre los Estados Partes del MERCOSUR y la Republica de Chile',
  1996,
  'complementation_agreement',
  'BR,AR,UY,PY,CL',
  'in_force',
  'https://www.sice.oas.org/Trade/MSCH/MSCH_e.asp',
  today,
);

console.log('Agreements seeded: 10');

// ── Seed: provisions ─────────────────────────────────────────────────

const insertProvision = db.prepare(`
  INSERT INTO provisions (agreement_id, article_ref, title, content, chapter, topic)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// --- Treaty of Asuncion provisions (loaded from seed file if available) ---

const SEED_DIR = join(__dirname, '..', 'data', 'seed');
let treatyProvisionCount = 0;

if (existsSync(SEED_DIR)) {
  const seedFiles = readdirSync(SEED_DIR).filter(f => f.endsWith('.json'));
  for (const file of seedFiles) {
    try {
      const raw = readFileSync(join(SEED_DIR, file), 'utf-8');
      const data = JSON.parse(raw);
      if (data.provisions && Array.isArray(data.provisions)) {
        const agreementId = data.agreement?.id;
        if (!agreementId) continue;
        for (const p of data.provisions) {
          try {
            insertProvision.run(
              p.agreement_id ?? agreementId,
              p.article_ref,
              p.title ?? null,
              p.content,
              p.chapter ?? null,
              p.topic ?? null,
            );
            treatyProvisionCount++;
          } catch (_e) {
            // Skip duplicate provisions
          }
        }
        console.log(`  Loaded ${data.provisions.length} provisions from seed/${file}`);
      }
    } catch (e) {
      console.warn(`  Warning: could not parse seed file ${file}: ${e}`);
    }
  }
}

// --- Protocol of Ouro Preto provisions ---

const ouroPretoProvisions = [
  {
    ref: '1', title: 'Estructura institucional del MERCOSUR',
    content: 'La estructura institucional del MERCOSUR contara con los siguientes organos: I - El Consejo del Mercado Comun (CMC); II - El Grupo Mercado Comun (GMC); III - La Comision de Comercio del MERCOSUR (CCM); IV - La Comision Parlamentaria Conjunta (CPC); V - El Foro Consultivo Economico-Social (FCES); VI - La Secretaria Administrativa del MERCOSUR (SAM).',
    chapter: 'Seccion I - Estructura del MERCOSUR', topic: 'dispute_resolution'
  },
  {
    ref: '2', title: 'Organos con capacidad decisoria',
    content: 'Son organos con capacidad decisoria, de naturaleza intergubernamental: el Consejo del Mercado Comun, el Grupo Mercado Comun y la Comision de Comercio del MERCOSUR.',
    chapter: 'Seccion I - Estructura del MERCOSUR', topic: 'dispute_resolution'
  },
  {
    ref: '3', title: 'Consejo del Mercado Comun',
    content: 'El Consejo del Mercado Comun es el organo superior del MERCOSUR al cual incumbe la conduccion politica del proceso de integracion y la toma de decisiones para asegurar el cumplimiento de los objetivos establecidos por el Tratado de Asuncion y para alcanzar la constitucion final del mercado comun.',
    chapter: 'Seccion II - Consejo del Mercado Comun', topic: 'dispute_resolution'
  },
  {
    ref: '8', title: 'Funciones y atribuciones del CMC',
    content: 'Son funciones y atribuciones del Consejo del Mercado Comun: I - Velar por el cumplimiento del Tratado de Asuncion, de sus Protocolos y de los acuerdos firmados en su marco; II - Formular politicas y promover las acciones necesarias para la conformacion del mercado comun; III - Ejercer la titularidad de la personalidad juridica del MERCOSUR; IV - Negociar y firmar acuerdos, en nombre del MERCOSUR, con terceros paises, grupos de paises y organismos internacionales; V - Pronunciarse sobre las propuestas que le sean elevadas por el Grupo Mercado Comun; VI - Crear reuniones de ministros y pronunciarse sobre los acuerdos que le sean remitidos por las mismas; VII - Crear los organos que estime pertinentes, asi como modificarlos o suprimirlos; VIII - Aclarar, cuando lo estime necesario, el contenido y alcance de sus Decisiones; IX - Designar al Director de la Secretaria Administrativa del MERCOSUR; X - Adoptar Decisiones en materia financiera y presupuestaria; XI - Homologar el Reglamento Interno del Grupo Mercado Comun.',
    chapter: 'Seccion II - Consejo del Mercado Comun', topic: 'dispute_resolution'
  },
  {
    ref: '9', title: 'Decisiones del CMC',
    content: 'El Consejo del Mercado Comun se pronunciara mediante Decisiones, las que seran obligatorias para los Estados Partes.',
    chapter: 'Seccion II - Consejo del Mercado Comun', topic: 'dispute_resolution'
  },
  {
    ref: '10', title: 'Grupo Mercado Comun',
    content: 'El Grupo Mercado Comun es el organo ejecutivo del MERCOSUR.',
    chapter: 'Seccion III - Grupo Mercado Comun', topic: 'dispute_resolution'
  },
  {
    ref: '14', title: 'Funciones y atribuciones del GMC',
    content: 'Son funciones y atribuciones del Grupo Mercado Comun: I - Velar, dentro de los limites de su competencia, por el cumplimiento del Tratado de Asuncion, de sus Protocolos y de los acuerdos firmados en su marco; II - Proponer proyectos de Decisiones al Consejo del Mercado Comun; III - Tomar las medidas necesarias para el cumplimiento de las Decisiones adoptadas por el Consejo del Mercado Comun; IV - Fijar programas de trabajo que aseguren avances para el establecimiento del mercado comun; V - Crear, modificar o suprimir organos tales como subgrupos de trabajo y reuniones especializadas, para el cumplimiento de sus objetivos; VI - Manifestarse sobre las propuestas o recomendaciones que le fueren sometidas por los demas organos del MERCOSUR en el ambito de sus competencias; VII - Negociar, con la participacion de representantes de todos los Estados Partes, por delegacion expresa del Consejo del Mercado Comun y dentro de los limites establecidos en mandatos especificos concedidos con esa finalidad, acuerdos en nombre del MERCOSUR con terceros paises, grupos de paises y organismos internacionales; VIII - Aprobar el presupuesto y la rendicion de cuentas anual presentada por la Secretaria Administrativa del MERCOSUR.',
    chapter: 'Seccion III - Grupo Mercado Comun', topic: 'dispute_resolution'
  },
  {
    ref: '15', title: 'Resoluciones del GMC',
    content: 'El Grupo Mercado Comun se pronunciara mediante Resoluciones, las que seran obligatorias para los Estados Partes.',
    chapter: 'Seccion III - Grupo Mercado Comun', topic: 'dispute_resolution'
  },
  {
    ref: '16', title: 'Comision de Comercio del MERCOSUR',
    content: 'A la Comision de Comercio del MERCOSUR, organo encargado de asistir al Grupo Mercado Comun, compete velar por la aplicacion de los instrumentos de politica comercial comun acordados por los Estados Partes para el funcionamiento de la union aduanera, asi como efectuar el seguimiento y revisar los temas y materias relacionados con las politicas comerciales comunes, con el comercio intra-MERCOSUR y con terceros paises.',
    chapter: 'Seccion IV - Comision de Comercio', topic: 'customs_union'
  },
  {
    ref: '19', title: 'Directivas de la CCM',
    content: 'La Comision de Comercio del MERCOSUR se pronunciara mediante Directivas o Propuestas. Las Directivas seran obligatorias para los Estados Partes.',
    chapter: 'Seccion IV - Comision de Comercio', topic: 'customs_union'
  },
  {
    ref: '34', title: 'Personalidad juridica del MERCOSUR',
    content: 'El MERCOSUR tendra personalidad juridica de Derecho Internacional.',
    chapter: 'Seccion VI - Personalidad Juridica', topic: 'dispute_resolution'
  },
  {
    ref: '37', title: 'Vigencia simultanea de normas',
    content: 'Las Decisiones de los organos del MERCOSUR seran tomadas por consenso y con la presencia de todos los Estados Partes.',
    chapter: 'Seccion VII - Disposiciones Generales', topic: 'dispute_resolution'
  },
  {
    ref: '40', title: 'Fuentes juridicas del MERCOSUR',
    content: 'Con la finalidad de garantizar la vigencia simultanea en los Estados Partes de las normas emanadas de los organos del MERCOSUR previstos en el Articulo 2 de este Protocolo, debera seguirse el siguiente procedimiento: i) Una vez aprobada la norma, los Estados Partes adoptaran las medidas necesarias para su incorporacion al ordenamiento juridico nacional y comunicaran las mismas a la Secretaria Administrativa del MERCOSUR; ii) Cuando todos los Estados Partes hubieren informado la incorporacion a sus respectivos ordenamientos juridicos internos, la Secretaria Administrativa del MERCOSUR comunicara el hecho a cada Estado Parte; iii) Las normas entraran en vigor simultaneamente en los Estados Partes 30 dias despues de la fecha de comunicacion efectuada por la Secretaria Administrativa del MERCOSUR.',
    chapter: 'Seccion VII - Disposiciones Generales', topic: 'dispute_resolution'
  },
  {
    ref: '41', title: 'Fuentes juridicas del MERCOSUR',
    content: 'Las fuentes juridicas del MERCOSUR son: I - El Tratado de Asuncion, sus protocolos y los instrumentos adicionales o complementarios; II - Los acuerdos celebrados en el marco del Tratado de Asuncion y sus protocolos; III - Las Decisiones del Consejo del Mercado Comun, las Resoluciones del Grupo Mercado Comun y las Directivas de la Comision de Comercio del MERCOSUR, adoptadas desde la entrada en vigor del Tratado de Asuncion.',
    chapter: 'Seccion VII - Disposiciones Generales', topic: 'dispute_resolution'
  },
];

for (const p of ouroPretoProvisions) {
  insertProvision.run(
    'protocol-ouro-preto', p.ref, p.title, p.content, p.chapter, p.topic,
  );
}
console.log(`  Protocol of Ouro Preto: ${ouroPretoProvisions.length} provisions`);

// --- Mercosur Digital Agenda provisions ---

const digitalAgendaProvisions = [
  {
    ref: '1', title: 'Objeto de la Agenda Digital',
    content: 'La Agenda Digital del MERCOSUR tiene por objeto establecer los lineamientos y acciones a desarrollar en materia de sociedad de la informacion, gobierno electronico, comercio electronico, proteccion de datos personales y seguridad de la informacion.',
    chapter: 'Capitulo I - Disposiciones Generales', topic: 'digital_trade'
  },
  {
    ref: '2', title: 'Objetivos',
    content: 'Son objetivos de la Agenda Digital: a) Promover el acceso de la poblacion a las Tecnologias de la Informacion y la Comunicacion (TIC); b) Fomentar el uso de las TIC para mejorar la prestacion de servicios publicos; c) Estimular el desarrollo del comercio electronico en la region; d) Promover la proteccion de datos personales y la seguridad de la informacion; e) Fomentar la cooperacion regional en materia de gobierno electronico; f) Impulsar la formacion de recursos humanos en TIC.',
    chapter: 'Capitulo I - Disposiciones Generales', topic: 'digital_trade'
  },
  {
    ref: '3', title: 'Comercio electronico regional',
    content: 'Los Estados Partes se comprometen a promover el desarrollo del comercio electronico en la region, facilitando las transacciones electronicas transfronterizas, la proteccion del consumidor en linea y la interoperabilidad de los sistemas de pago electronico.',
    chapter: 'Capitulo II - Comercio Electronico', topic: 'e_commerce'
  },
  {
    ref: '4', title: 'Proteccion del consumidor en linea',
    content: 'Los Estados Partes adoptaran medidas para garantizar la proteccion de los consumidores en el comercio electronico transfronterizo, incluyendo el derecho a la informacion, el derecho de desistimiento y la resolucion alternativa de conflictos.',
    chapter: 'Capitulo II - Comercio Electronico', topic: 'e_commerce'
  },
  {
    ref: '5', title: 'Firma electronica y documentos electronicos',
    content: 'Los Estados Partes reconoceran mutuamente la validez juridica de las firmas electronicas y los documentos electronicos, conforme a los estandares y normativas armonizadas que se establezcan.',
    chapter: 'Capitulo III - Firma Electronica', topic: 'digital_trade'
  },
  {
    ref: '6', title: 'Proteccion de datos personales',
    content: 'Los Estados Partes se comprometen a adoptar marcos normativos adecuados para la proteccion de datos personales que garanticen un nivel adecuado de proteccion, facilitando al mismo tiempo el flujo transfronterizo de datos necesario para el comercio y la cooperacion regional.',
    chapter: 'Capitulo IV - Proteccion de Datos', topic: 'data_flows'
  },
  {
    ref: '7', title: 'Transferencia internacional de datos',
    content: 'Los Estados Partes promoveran mecanismos que faciliten la transferencia internacional de datos personales entre los Estados Partes, siempre que se garantice un nivel adecuado de proteccion conforme a las legislaciones nacionales.',
    chapter: 'Capitulo IV - Proteccion de Datos', topic: 'data_flows'
  },
  {
    ref: '8', title: 'Seguridad de la informacion',
    content: 'Los Estados Partes se comprometen a promover la seguridad de la informacion y la ciberseguridad, desarrollando capacidades nacionales y regionales, compartiendo informacion sobre amenazas y vulnerabilidades, y cooperando en la respuesta a incidentes de seguridad informatica.',
    chapter: 'Capitulo V - Seguridad de la Informacion', topic: 'digital_trade'
  },
  {
    ref: '9', title: 'Gobierno electronico',
    content: 'Los Estados Partes cooperaran en el desarrollo de iniciativas de gobierno electronico que mejoren la eficiencia, transparencia y accesibilidad de los servicios publicos, promoviendo la interoperabilidad de los sistemas y plataformas gubernamentales.',
    chapter: 'Capitulo VI - Gobierno Electronico', topic: 'digital_trade'
  },
  {
    ref: '10', title: 'Implementacion y seguimiento',
    content: 'El Grupo Agenda Digital del MERCOSUR sera responsable de la implementacion, seguimiento y evaluacion de las acciones previstas en la presente Agenda, debiendo informar periodicamente al Grupo Mercado Comun sobre los avances logrados.',
    chapter: 'Capitulo VII - Disposiciones Finales', topic: 'digital_trade'
  },
];

for (const p of digitalAgendaProvisions) {
  insertProvision.run(
    'mercosur-digital-agenda', p.ref, p.title, p.content, p.chapter, p.topic,
  );
}
console.log(`  Mercosur Digital Agenda: ${digitalAgendaProvisions.length} provisions`);

// --- Mercosur E-Commerce Agreement provisions ---

const ecommerceProvisions = [
  {
    ref: '1', title: 'Definiciones',
    content: 'A los efectos del presente Acuerdo se entendera por: a) "Comercio electronico": toda transaccion comercial de bienes o servicios realizada por medios electronicos; b) "Mensaje de datos": la informacion generada, enviada, recibida o archivada por medios electronicos, opticos o similares; c) "Servicio digital": todo servicio prestado a traves de medios electronicos, incluyendo la transmision de datos por internet.',
    chapter: 'Capitulo I - Disposiciones Generales', topic: 'e_commerce'
  },
  {
    ref: '2', title: 'Ambito de aplicacion',
    content: 'El presente Acuerdo se aplica a las medidas adoptadas o mantenidas por un Estado Parte que afecten el comercio electronico, incluyendo la produccion, distribucion, comercializacion, venta o suministro de bienes y servicios por medios electronicos.',
    chapter: 'Capitulo I - Disposiciones Generales', topic: 'e_commerce'
  },
  {
    ref: '3', title: 'Principio de no discriminacion',
    content: 'Los Estados Partes no impondran derechos de aduana, aranceles ni otros gravamenes a las transmisiones electronicas entre los Estados Partes. Lo anterior se entiende sin perjuicio del derecho de un Estado Parte a imponer impuestos internos o cargas internas de conformidad con sus obligaciones en el marco del MERCOSUR.',
    chapter: 'Capitulo II - Facilitacion del Comercio Electronico', topic: 'e_commerce'
  },
  {
    ref: '4', title: 'Autenticacion y firma electronica',
    content: 'Ninguna Parte negara la validez juridica de una firma unicamente por el hecho de ser electronica. Cada Parte adoptara o mantendra legislacion que permita las transacciones electronicas, tomando en cuenta los marcos internacionales aplicables para la interoperabilidad, incluyendo los de la Comision de las Naciones Unidas para el Derecho Mercantil Internacional (CNUDMI).',
    chapter: 'Capitulo II - Facilitacion del Comercio Electronico', topic: 'e_commerce'
  },
  {
    ref: '5', title: 'Proteccion del consumidor en linea',
    content: 'Cada Parte adoptara o mantendra legislacion sobre proteccion del consumidor para las transacciones de comercio electronico que sea al menos equivalente a la proporcionada para otras formas de comercio, incluyendo proteccion contra practicas comerciales fraudulentas y enganosas.',
    chapter: 'Capitulo III - Proteccion del Consumidor', topic: 'e_commerce'
  },
  {
    ref: '6', title: 'Proteccion de datos personales',
    content: 'Cada Parte adoptara o mantendra un marco juridico que disponga la proteccion de los datos personales de los usuarios del comercio electronico. En el desarrollo de su marco de proteccion de datos personales, cada Parte tomara en cuenta los principios y directrices de los organismos internacionales pertinentes.',
    chapter: 'Capitulo IV - Proteccion de Datos Personales', topic: 'data_flows'
  },
  {
    ref: '7', title: 'Flujos transfronterizos de datos',
    content: 'Los Estados Partes reconocen que facilitar los flujos transfronterizos de informacion, incluyendo datos personales, es importante para promover el comercio electronico. A tal efecto, las Partes se comprometen a no restringir los flujos transfronterizos de datos por medios electronicos cuando ello sea necesario para la conduccion de negocios, sujeto a las excepciones previstas en la legislacion aplicable en materia de proteccion de datos personales.',
    chapter: 'Capitulo IV - Proteccion de Datos Personales', topic: 'data_flows'
  },
  {
    ref: '8', title: 'Localizacion de servidores',
    content: 'Ninguna Parte exigira a un proveedor de servicios cubierto por este Acuerdo que utilice o ubique instalaciones de computacion en el territorio de la Parte como condicion para la conduccion de negocios en ese territorio, siempre que se cumplan las disposiciones sobre proteccion de datos personales.',
    chapter: 'Capitulo IV - Proteccion de Datos Personales', topic: 'data_flows'
  },
  {
    ref: '9', title: 'Fuentes abiertas',
    content: 'Las Partes reconocen la importancia del uso de codigo fuente abierto para el desarrollo de aplicaciones de comercio electronico y promoveran su utilizacion cuando sea apropiado. Ninguna Parte exigira la transferencia de, o el acceso al, codigo fuente de software de propiedad de una persona de otra Parte como condicion para la provision de servicios relacionados.',
    chapter: 'Capitulo V - Disposiciones Adicionales', topic: 'digital_trade'
  },
  {
    ref: '10', title: 'Cooperacion en comercio electronico',
    content: 'Las Partes reconocen la importancia de la cooperacion en materia de comercio electronico y se comprometen a: a) intercambiar informacion y experiencias sobre regulacion del comercio electronico; b) cooperar en el desarrollo de mecanismos de resolucion alternativa de controversias; c) promover iniciativas para facilitar el uso del comercio electronico por las micro, pequenas y medianas empresas.',
    chapter: 'Capitulo V - Disposiciones Adicionales', topic: 'e_commerce'
  },
  {
    ref: '11', title: 'Ciberseguridad',
    content: 'Los Estados Partes reconocen la importancia de desarrollar capacidades de ciberseguridad para fortalecer la confianza en el comercio electronico. Cada Parte adoptara medidas de seguridad adecuadas para proteger a los usuarios del comercio electronico de amenazas ciberneticas y cooperara con las demas Partes en el intercambio de informacion sobre amenazas y vulnerabilidades.',
    chapter: 'Capitulo VI - Seguridad', topic: 'digital_trade'
  },
  {
    ref: '12', title: 'Resolucion de controversias',
    content: 'Cualquier controversia que surja en relacion con la interpretacion o aplicacion del presente Acuerdo sera resuelta de conformidad con el Sistema de Solucion de Controversias del MERCOSUR establecido en el Protocolo de Olivos.',
    chapter: 'Capitulo VII - Disposiciones Finales', topic: 'dispute_resolution'
  },
];

for (const p of ecommerceProvisions) {
  insertProvision.run(
    'mercosur-e-commerce', p.ref, p.title, p.content, p.chapter, p.topic,
  );
}
console.log(`  Mercosur E-Commerce Agreement: ${ecommerceProvisions.length} provisions`);

// --- Mercosur Data Protection Agreement provisions ---

const dataProtectionProvisions = [
  {
    ref: '1', title: 'Objeto',
    content: 'El presente Acuerdo tiene por objeto establecer un marco comun para la proteccion de datos personales en los Estados Partes del MERCOSUR, facilitando el flujo transfronterizo de datos y garantizando un nivel adecuado de proteccion de los derechos fundamentales de las personas.',
    chapter: 'Capitulo I - Disposiciones Generales', topic: 'data_flows'
  },
  {
    ref: '2', title: 'Definiciones',
    content: 'A los efectos del presente Acuerdo se entendera por: a) "Datos personales": toda informacion referida a personas fisicas o juridicas determinadas o determinables; b) "Tratamiento de datos": operaciones y procedimientos sistematicos, electronicos o no, que permitan la recoleccion, conservacion, ordenamiento, almacenamiento, modificacion, relacionamiento, evaluacion, bloqueo, destruccion, y en general el procesamiento de datos personales; c) "Responsable del tratamiento": persona fisica o juridica, publica o privada, titular de la base de datos; d) "Titular de los datos": persona fisica o juridica cuyos datos son objeto de tratamiento; e) "Transferencia internacional": toda transmision de datos personales fuera del territorio del Estado Parte.',
    chapter: 'Capitulo I - Disposiciones Generales', topic: 'data_flows'
  },
  {
    ref: '3', title: 'Principios generales',
    content: 'El tratamiento de datos personales debera observar los siguientes principios: a) Licitud: el tratamiento de datos personales solo podra realizarse con el consentimiento del titular o cuando la ley lo autorice; b) Finalidad: los datos personales deberan ser recolectados con fines determinados, explicitos y legitimos; c) Proporcionalidad: los datos recolectados seran adecuados, pertinentes y no excesivos en relacion con la finalidad para la cual fueron recopilados; d) Calidad: los datos personales deberan ser exactos y actualizados; e) Seguridad: el responsable del tratamiento debera adoptar las medidas tecnicas y organizativas necesarias para garantizar la seguridad de los datos personales; f) Responsabilidad: el responsable del tratamiento sera responsable del cumplimiento de estos principios.',
    chapter: 'Capitulo II - Principios', topic: 'data_flows'
  },
  {
    ref: '4', title: 'Derechos del titular',
    content: 'Los Estados Partes garantizaran a los titulares de datos personales los siguientes derechos: a) Derecho de acceso: el titular podra solicitar informacion sobre sus datos personales; b) Derecho de rectificacion: el titular podra solicitar la correccion de datos inexactos; c) Derecho de supresion: el titular podra solicitar la eliminacion de sus datos personales cuando sean innecesarios; d) Derecho de oposicion: el titular podra oponerse al tratamiento de sus datos personales por motivos legitimos.',
    chapter: 'Capitulo III - Derechos', topic: 'data_flows'
  },
  {
    ref: '5', title: 'Transferencias internacionales',
    content: 'La transferencia internacional de datos personales solo podra realizarse hacia paises u organismos internacionales que proporcionen un nivel adecuado de proteccion. Los Estados Partes del MERCOSUR se reconocen mutuamente como proporcionando un nivel adecuado de proteccion de datos personales.',
    chapter: 'Capitulo IV - Transferencias Internacionales', topic: 'data_flows'
  },
  {
    ref: '6', title: 'Mecanismos de transferencia',
    content: 'En ausencia de una determinacion de nivel adecuado de proteccion, las transferencias internacionales podran realizarse mediante: a) clausulas contractuales tipo aprobadas por la autoridad de control competente; b) normas corporativas vinculantes; c) codigos de conducta aprobados; d) mecanismos de certificacion reconocidos; e) consentimiento explicito del titular.',
    chapter: 'Capitulo IV - Transferencias Internacionales', topic: 'data_flows'
  },
  {
    ref: '7', title: 'Autoridades de control',
    content: 'Cada Estado Parte designara una o varias autoridades de control independientes encargadas de supervisar el cumplimiento de las normas de proteccion de datos personales. Las autoridades de control de los Estados Partes cooperaran entre si para el efectivo cumplimiento de las disposiciones del presente Acuerdo.',
    chapter: 'Capitulo V - Autoridades de Control', topic: 'data_flows'
  },
  {
    ref: '8', title: 'Cooperacion entre autoridades',
    content: 'Las autoridades de control de los Estados Partes: a) Se prestaran asistencia mutua en el desempeno de sus funciones; b) Intercambiaran informacion relevante para el cumplimiento de sus funciones; c) Realizaran investigaciones conjuntas cuando sea necesario; d) Desarrollaran mecanismos de cooperacion para la resolucion de controversias transfronterizas en materia de proteccion de datos.',
    chapter: 'Capitulo V - Autoridades de Control', topic: 'data_flows'
  },
  {
    ref: '9', title: 'Sanciones',
    content: 'Los Estados Partes adoptaran las medidas necesarias para que las infracciones a las disposiciones de proteccion de datos personales sean sancionadas de manera efectiva, proporcionada y disuasoria, conforme a sus respectivos ordenamientos juridicos.',
    chapter: 'Capitulo VI - Sanciones', topic: 'data_flows'
  },
  {
    ref: '10', title: 'Revision periodica',
    content: 'Los Estados Partes revisaran periodicamente el presente Acuerdo para evaluar su efectividad y actualizarlo conforme a los desarrollos normativos internacionales en materia de proteccion de datos personales. La primera revision se realizara dentro de los tres anos siguientes a su entrada en vigor.',
    chapter: 'Capitulo VII - Disposiciones Finales', topic: 'data_flows'
  },
];

for (const p of dataProtectionProvisions) {
  insertProvision.run(
    'mercosur-data-protection', p.ref, p.title, p.content, p.chapter, p.topic,
  );
}
console.log(`  Mercosur Data Protection Agreement: ${dataProtectionProvisions.length} provisions`);

// --- Pacific Alliance Additional Protocol provisions ---

const paProtocolProvisions = [
  {
    ref: '1.1', title: 'Establecimiento de la zona de libre comercio',
    content: 'Las Partes establecen una zona de libre comercio de conformidad con lo dispuesto en el Articulo XXIV del Acuerdo General sobre Aranceles Aduaneros y Comercio de 1994 (GATT de 1994) y el Articulo V del Acuerdo General sobre el Comercio de Servicios (AGCS).',
    chapter: 'Capitulo 1 - Disposiciones Iniciales', topic: 'free_movement'
  },
  {
    ref: '1.2', title: 'Objetivos',
    content: 'Los objetivos del presente Protocolo Adicional son: a) Fomentar el crecimiento y desarrollo economico de las Partes; b) Alcanzar una mayor liberalizacion del comercio de bienes y servicios; c) Promover las inversiones; d) Contribuir a la creacion de empleo; e) Fomentar la competitividad de las economias de las Partes.',
    chapter: 'Capitulo 1 - Disposiciones Iniciales', topic: 'free_movement'
  },
  {
    ref: '3.1', title: 'Trato nacional',
    content: 'Cada Parte otorgara trato nacional a las mercancias de las otras Partes de conformidad con el Articulo III del GATT de 1994, incluidas sus notas interpretativas. Para tal efecto, el Articulo III del GATT de 1994 y sus notas interpretativas se incorporan al presente Protocolo Adicional y forman parte integrante del mismo, mutatis mutandis.',
    chapter: 'Capitulo 3 - Trato Nacional y Acceso a Mercados', topic: 'free_movement'
  },
  {
    ref: '3.4', title: 'Eliminacion de aranceles aduaneros',
    content: 'Salvo que se disponga algo diferente en este Protocolo Adicional, ninguna Parte podra incrementar ningun arancel aduanero existente, ni adoptar ningun arancel aduanero nuevo, sobre una mercancia originaria. Cada Parte eliminara progresivamente sus aranceles aduaneros sobre mercancias originarias de conformidad con los cronogramas de desgravacion establecidos en el Anexo 3.4.',
    chapter: 'Capitulo 3 - Trato Nacional y Acceso a Mercados', topic: 'free_movement'
  },
  {
    ref: '4.1', title: 'Reglas de origen',
    content: 'Las mercancias originarias de una Parte tendran derecho al trato arancelario preferencial conforme a este Protocolo Adicional, de acuerdo con las reglas de origen establecidas en este Capitulo.',
    chapter: 'Capitulo 4 - Reglas de Origen', topic: 'customs_union'
  },
  {
    ref: '8.1', title: 'Contratacion publica - Ambito de aplicacion',
    content: 'Este Capitulo se aplica a cualquier medida relativa a la contratacion publica cubierta, ya sea que se realice o no exclusiva o parcialmente por medios electronicos.',
    chapter: 'Capitulo 8 - Contratacion Publica', topic: 'services'
  },
  {
    ref: '9.1', title: 'Comercio transfronterizo de servicios',
    content: 'Cada Parte otorgara a los servicios y a los proveedores de servicios de otra Parte un trato no menos favorable que el que otorgue, en circunstancias similares, a sus propios servicios y proveedores de servicios similares.',
    chapter: 'Capitulo 9 - Comercio Transfronterizo de Servicios', topic: 'services'
  },
  {
    ref: '10.1', title: 'Inversion - Ambito y cobertura',
    content: 'Este Capitulo se aplica a las medidas que adopte o mantenga una Parte relativas a: a) los inversionistas de otra Parte; b) las inversiones cubiertas; y c) con respecto a los articulos sobre requisitos de desempeno y medioambiente, a todas las inversiones en el territorio de la Parte.',
    chapter: 'Capitulo 10 - Inversion', topic: 'investment'
  },
  {
    ref: '10.3', title: 'Trato nacional de inversiones',
    content: 'Cada Parte otorgara a los inversionistas de otra Parte un trato no menos favorable que el que otorgue, en circunstancias similares, a sus propios inversionistas con respecto al establecimiento, adquisicion, expansion, administracion, conduccion, operacion y venta u otra forma de disposicion de inversiones en su territorio.',
    chapter: 'Capitulo 10 - Inversion', topic: 'investment'
  },
  {
    ref: '13.1', title: 'Comercio electronico - Disposiciones generales',
    content: 'Las Partes reconocen el crecimiento economico y las oportunidades que el comercio electronico proporciona, la importancia de marcos que promuevan la confianza del consumidor en el comercio electronico, y la importancia de evitar obstaculos innecesarios a su utilizacion y desarrollo.',
    chapter: 'Capitulo 13 - Comercio Electronico', topic: 'e_commerce'
  },
  {
    ref: '13.2', title: 'Derechos de aduana y comercio electronico',
    content: 'Ninguna Parte podra imponer derechos de aduana, tasas o cargos a la importacion o exportacion de transmisiones electronicas, incluyendo contenidos transmitidos electronicamente.',
    chapter: 'Capitulo 13 - Comercio Electronico', topic: 'e_commerce'
  },
  {
    ref: '13.4', title: 'Proteccion del consumidor en linea',
    content: 'Las Partes reconocen la importancia de adoptar y mantener medidas transparentes y efectivas de proteccion del consumidor para las transacciones realizadas por comercio electronico.',
    chapter: 'Capitulo 13 - Comercio Electronico', topic: 'e_commerce'
  },
  {
    ref: '13.5', title: 'Proteccion de datos personales',
    content: 'Las Partes reconocen la importancia de proteger los datos personales de los usuarios del comercio electronico y adoptaran o mantendran un marco juridico que disponga la proteccion de los datos personales.',
    chapter: 'Capitulo 13 - Comercio Electronico', topic: 'data_flows'
  },
  {
    ref: '14.1', title: 'Propiedad intelectual - Disposiciones generales',
    content: 'Las Partes afirman sus derechos y obligaciones existentes conforme al Acuerdo sobre los Aspectos de los Derechos de Propiedad Intelectual relacionados con el Comercio (Acuerdo sobre los ADPIC) y otros acuerdos multilaterales sobre propiedad intelectual de los cuales sean parte.',
    chapter: 'Capitulo 14 - Propiedad Intelectual', topic: 'intellectual_property'
  },
  {
    ref: '14.6', title: 'Marcas',
    content: 'Cada Parte proveera un sistema para el registro de marcas, que incluira la obligacion de dar a los solicitantes las razones por escrito en caso de denegacion del registro, la oportunidad de impugnar la denegacion, y que las decisiones finales sean publicadas.',
    chapter: 'Capitulo 14 - Propiedad Intelectual', topic: 'intellectual_property'
  },
  {
    ref: '17.1', title: 'Solucion de controversias - Ambito',
    content: 'Salvo que en este Protocolo Adicional se disponga otra cosa, las disposiciones sobre solucion de controversias de este Capitulo se aplicaran a la solucion de todas las controversias entre las Partes relativas a la interpretacion o aplicacion de este Protocolo Adicional, o cuando una Parte considere que una medida de otra Parte es incompatible con las obligaciones de este Protocolo Adicional.',
    chapter: 'Capitulo 17 - Solucion de Controversias', topic: 'dispute_resolution'
  },
];

for (const p of paProtocolProvisions) {
  insertProvision.run(
    'pa-additional-protocol', p.ref, p.title, p.content, p.chapter, p.topic,
  );
}
console.log(`  Pacific Alliance Additional Protocol: ${paProtocolProvisions.length} provisions`);

// --- Pacific Alliance Digital Agenda provisions ---

const paDigitalProvisions = [
  {
    ref: '1', title: 'Economia digital como pilar de integracion',
    content: 'Los paises de la Alianza del Pacifico reconocen la economia digital como un pilar fundamental para la integracion y el desarrollo economico de la region, comprometiendose a impulsar acciones conjuntas que promuevan la transformacion digital de sus economias.',
    chapter: 'Lineamientos Generales', topic: 'digital_trade'
  },
  {
    ref: '2', title: 'Mercado digital regional',
    content: 'Los paises miembros promoveran la creacion de un mercado digital regional que facilite el comercio electronico transfronterizo, la interoperabilidad de los marcos regulatorios, y la eliminacion de barreras innecesarias al comercio digital.',
    chapter: 'Eje 1 - Economia Digital', topic: 'digital_trade'
  },
  {
    ref: '3', title: 'Conectividad digital',
    content: 'Los paises miembros cooperaran en el desarrollo de infraestructura digital que permita la conectividad de alta velocidad en la region, incluyendo redes de fibra optica, centros de datos y puntos de intercambio de trafico de internet (IXP).',
    chapter: 'Eje 2 - Conectividad', topic: 'digital_trade'
  },
  {
    ref: '4', title: 'Gobierno digital e interoperabilidad',
    content: 'Los paises miembros promoveran la interoperabilidad de los sistemas de gobierno digital, facilitando el reconocimiento mutuo de identidades digitales, firmas electronicas y documentos electronicos entre los paises de la Alianza.',
    chapter: 'Eje 3 - Gobierno Digital', topic: 'digital_trade'
  },
  {
    ref: '5', title: 'Ecosistema de emprendimiento digital',
    content: 'Los paises miembros promoveran el ecosistema de emprendimiento e innovacion digital, facilitando el acceso a financiamiento, la formacion de recursos humanos en tecnologias digitales, y la internacionalizacion de empresas de base tecnologica.',
    chapter: 'Eje 4 - Ecosistema Digital', topic: 'digital_trade'
  },
  {
    ref: '6', title: 'Flujos de datos transfronterizos',
    content: 'Los paises miembros reconocen la importancia de los flujos de datos transfronterizos para la economia digital y se comprometen a no imponer restricciones innecesarias a los mismos, garantizando al mismo tiempo la proteccion de los datos personales conforme a los marcos normativos aplicables.',
    chapter: 'Eje 5 - Marco Regulatorio', topic: 'data_flows'
  },
  {
    ref: '7', title: 'Ciberseguridad regional',
    content: 'Los paises miembros cooperaran en materia de ciberseguridad, desarrollando estrategias nacionales de ciberseguridad armonizadas, compartiendo informacion sobre amenazas y vulnerabilidades, y fortaleciendo las capacidades de respuesta a incidentes ciberneticos.',
    chapter: 'Eje 5 - Marco Regulatorio', topic: 'digital_trade'
  },
  {
    ref: '8', title: 'Proteccion del consumidor digital',
    content: 'Los paises miembros adoptaran medidas coordinadas para la proteccion del consumidor en el entorno digital, incluyendo mecanismos de resolucion alternativa de controversias transfronteriza y marcos de confianza para el comercio electronico.',
    chapter: 'Eje 5 - Marco Regulatorio', topic: 'e_commerce'
  },
];

for (const p of paDigitalProvisions) {
  insertProvision.run(
    'pa-digital-agenda', p.ref, p.title, p.content, p.chapter, p.topic,
  );
}
console.log(`  Pacific Alliance Digital Agenda: ${paDigitalProvisions.length} provisions`);

// --- PROSUR Declaration on Digital Economy provisions ---

const prosurDigitalProvisions = [
  {
    ref: '1', title: 'Vision de la economia digital sudamericana',
    content: 'Los Presidentes de los paises miembros del Foro para el Progreso y Desarrollo de America del Sur (PROSUR) declaran su compromiso de impulsar la economia digital como motor de desarrollo e integracion regional, reconociendo el potencial transformador de las tecnologias digitales para el crecimiento economico inclusivo.',
    chapter: 'Preambulo', topic: 'digital_trade'
  },
  {
    ref: '2', title: 'Conectividad e infraestructura digital',
    content: 'Los paises miembros se comprometen a cooperar en el desarrollo de la infraestructura digital necesaria para la integracion regional, incluyendo: redes de telecomunicaciones de alta capacidad, interconexion de redes de investigacion academica, desarrollo de infraestructura de datos en la nube, y expansion de la cobertura de internet de banda ancha.',
    chapter: 'Eje 1 - Infraestructura', topic: 'digital_trade'
  },
  {
    ref: '3', title: 'Facilitacion del comercio digital',
    content: 'Los paises miembros promoveran la facilitacion del comercio digital transfronterizo, incluyendo la simplificacion de procedimientos aduaneros para el comercio electronico, la armonizacion de marcos regulatorios para servicios digitales, y la eliminacion de barreras innecesarias al comercio digital.',
    chapter: 'Eje 2 - Comercio Digital', topic: 'e_commerce'
  },
  {
    ref: '4', title: 'Proteccion de datos y privacidad',
    content: 'Los paises miembros reconocen la necesidad de marcos juridicos adecuados para la proteccion de datos personales que sean compatibles con el desarrollo de la economia digital, y se comprometen a trabajar conjuntamente en la armonizacion de sus marcos regulatorios sobre proteccion de datos y privacidad.',
    chapter: 'Eje 3 - Marco Regulatorio', topic: 'data_flows'
  },
  {
    ref: '5', title: 'Ciberseguridad',
    content: 'Los paises miembros cooperaran en el desarrollo de capacidades de ciberseguridad, incluyendo la creacion de equipos de respuesta a incidentes de seguridad informatica (CSIRT) nacionales, el intercambio de informacion sobre amenazas ciberneticas, y el desarrollo de marcos normativos armonizados en materia de ciberseguridad.',
    chapter: 'Eje 3 - Marco Regulatorio', topic: 'digital_trade'
  },
  {
    ref: '6', title: 'Identidad digital y gobierno electronico',
    content: 'Los paises miembros promoveran el reconocimiento mutuo de identidades digitales y la interoperabilidad de los servicios de gobierno electronico, facilitando el acceso de los ciudadanos a servicios publicos digitales transfronterizos.',
    chapter: 'Eje 4 - Gobierno Digital', topic: 'digital_trade'
  },
  {
    ref: '7', title: 'Innovacion y emprendimiento tecnologico',
    content: 'Los paises miembros promoveran ecosistemas de innovacion y emprendimiento tecnologico, facilitando la movilidad de emprendedores, el acceso a financiamiento para startups tecnologicas, y la creacion de redes de colaboracion entre centros de innovacion de la region.',
    chapter: 'Eje 5 - Innovacion', topic: 'digital_trade'
  },
  {
    ref: '8', title: 'Inclusion digital',
    content: 'Los paises miembros se comprometen a promover la inclusion digital, reduciendo la brecha digital entre areas urbanas y rurales, entre generos, y entre diferentes grupos etarios, facilitando el acceso universal a las tecnologias digitales y la formacion de competencias digitales.',
    chapter: 'Eje 6 - Inclusion Digital', topic: 'digital_trade'
  },
  {
    ref: '9', title: 'Inteligencia artificial y tecnologias emergentes',
    content: 'Los paises miembros cooperaran en el desarrollo y la gobernanza responsable de la inteligencia artificial y otras tecnologias emergentes, promoviendo marcos eticos y regulatorios que equilibren la innovacion con la proteccion de los derechos fundamentales.',
    chapter: 'Eje 7 - Tecnologias Emergentes', topic: 'digital_trade'
  },
  {
    ref: '10', title: 'Mecanismo de seguimiento',
    content: 'Se establece un Grupo de Trabajo de Economia Digital en el marco de PROSUR para el seguimiento e implementacion de los compromisos asumidos en la presente Declaracion, que debera reunirse al menos dos veces al ano e informar a los Coordinadores Nacionales sobre los avances logrados.',
    chapter: 'Disposiciones Finales', topic: 'digital_trade'
  },
];

for (const p of prosurDigitalProvisions) {
  insertProvision.run(
    'prosur-digital-declaration', p.ref, p.title, p.content, p.chapter, p.topic,
  );
}
console.log(`  PROSUR Declaration on Digital Economy: ${prosurDigitalProvisions.length} provisions`);

// --- Mercosur-EU Association Agreement provisions ---

const mercosurEuProvisions = [
  {
    ref: '1', title: 'Objeto del Acuerdo',
    content: 'El presente Acuerdo tiene por objeto establecer una Asociacion politica y economica entre las Partes, basada en la reciprocidad, el interes comun y la profundizacion de sus relaciones en todos los ambitos de su aplicacion. El pilar comercial busca crear una zona de libre comercio de conformidad con las disposiciones del GATT y del Acuerdo General sobre el Comercio de Servicios.',
    chapter: 'Parte I - Disposiciones Generales', topic: 'free_movement'
  },
  {
    ref: '2', title: 'Comercio de mercancias',
    content: 'Las Partes liberalizaran progresivamente sus respectivos aranceles aduaneros sobre las mercancias originarias de la otra Parte, de conformidad con los cronogramas de reduccion arancelaria establecidos en los Anexos. El acuerdo cubre el 91% de las lineas arancelarias de la Union Europea y el 93% de las importaciones del Mercosur.',
    chapter: 'Parte II - Comercio', topic: 'free_movement'
  },
  {
    ref: '3', title: 'Reglas de origen',
    content: 'A los efectos de la aplicacion del trato arancelario preferencial, las mercancias seran consideradas originarias de una Parte cuando hayan sido enteramente obtenidas en dicha Parte, o cuando hayan sido producidas en dicha Parte utilizando materiales no originarios que hayan sido sometidos a una transformacion suficiente conforme a las reglas especificas de origen establecidas en el Anexo.',
    chapter: 'Parte II - Comercio', topic: 'customs_union'
  },
  {
    ref: '4', title: 'Medidas sanitarias y fitosanitarias',
    content: 'Las Partes confirman sus derechos y obligaciones en virtud del Acuerdo sobre la Aplicacion de Medidas Sanitarias y Fitosanitarias de la OMC. Las Partes cooperaran para facilitar el comercio preservando al mismo tiempo la capacidad de cada Parte de proteger la vida y la salud de las personas, los animales y las plantas en su territorio.',
    chapter: 'Parte II - Comercio', topic: 'free_movement'
  },
  {
    ref: '5', title: 'Obstaculos tecnicos al comercio',
    content: 'Las Partes confirman sus derechos y obligaciones en virtud del Acuerdo sobre Obstaculos Tecnicos al Comercio de la OMC y cooperaran para facilitar y aumentar el comercio bilateral de mercancias, incluyendo la identificacion, prevencion y eliminacion de obstaculos tecnicos innecesarios al comercio.',
    chapter: 'Parte II - Comercio', topic: 'free_movement'
  },
  {
    ref: '6', title: 'Comercio de servicios',
    content: 'Las Partes se comprometen a liberalizar progresivamente el comercio de servicios de conformidad con el Articulo V del AGCS. Cada Parte otorgara a los servicios y proveedores de servicios de la otra Parte un trato no menos favorable que el previsto en los compromisos especificos recogidos en sus respectivas Listas de Compromisos.',
    chapter: 'Parte II - Comercio', topic: 'services'
  },
  {
    ref: '7', title: 'Comercio digital',
    content: 'Las Partes reconocen la importancia del comercio digital y acuerdan que: a) no se impondran derechos de aduana a las transmisiones electronicas; b) se protegeran los datos personales de los usuarios del comercio electronico; c) se promovera la interoperabilidad; d) se cooperara en materia de ciberseguridad. Las Partes reconocen la importancia de que cualquier medida regulatoria sea compatible con los estandares internacionales.',
    chapter: 'Parte II - Comercio', topic: 'e_commerce'
  },
  {
    ref: '8', title: 'Flujos de datos y proteccion de datos personales',
    content: 'Las Partes se comprometen a garantizar la proteccion de los datos personales y la privacidad. Cada Parte podra adoptar o mantener las medidas que considere apropiadas para garantizar la proteccion de los datos personales y la privacidad, incluyendo la adopcion y aplicacion de reglas sobre la transferencia transfronteriza de datos personales. Nada en este Acuerdo impedira que una Parte adopte medidas para la proteccion de datos personales que considere necesarias.',
    chapter: 'Parte II - Comercio', topic: 'data_flows'
  },
  {
    ref: '9', title: 'Propiedad intelectual',
    content: 'Las Partes otorgaran y garantizaran una proteccion adecuada y efectiva de los derechos de propiedad intelectual de conformidad con los mas altos estandares internacionales, incluyendo los medios efectivos para el ejercicio de esos derechos previstos en el Acuerdo sobre los ADPIC. Las Partes acuerdan proteger las indicaciones geograficas conforme a las listas incluidas en el Anexo.',
    chapter: 'Parte II - Comercio', topic: 'intellectual_property'
  },
  {
    ref: '10', title: 'Desarrollo sostenible',
    content: 'Las Partes se comprometen a promover el desarrollo del comercio internacional de manera que contribuya al objetivo del desarrollo sostenible, en sus dimensiones economica, social y ambiental. Las Partes reafirman sus compromisos en virtud del Acuerdo de Paris y se comprometen a implementar efectivamente sus obligaciones derivadas de este Acuerdo.',
    chapter: 'Parte III - Desarrollo Sostenible', topic: 'free_movement'
  },
  {
    ref: '11', title: 'Solucion de controversias',
    content: 'Las Partes procuraran resolver toda controversia relativa a la interpretacion o aplicacion de las disposiciones comerciales de este Acuerdo mediante consultas y negociaciones. Si las consultas no resuelven la controversia, cualquiera de las Partes podra solicitar el establecimiento de un panel arbitral compuesto por tres miembros.',
    chapter: 'Parte IV - Solucion de Controversias', topic: 'dispute_resolution'
  },
  {
    ref: '12', title: 'Cooperacion regulatoria',
    content: 'Las Partes promoveran la cooperacion regulatoria para reducir las diferencias innecesarias entre sus respectivos marcos regulatorios, mejorando la compatibilidad de las medidas reglamentarias. La cooperacion regulatoria sera voluntaria y no impedira que cada Parte adopte las medidas regulatorias que considere apropiadas.',
    chapter: 'Parte V - Cooperacion', topic: 'services'
  },
];

for (const p of mercosurEuProvisions) {
  insertProvision.run(
    'mercosur-eu-association', p.ref, p.title, p.content, p.chapter, p.topic,
  );
}
console.log(`  Mercosur-EU Association Agreement: ${mercosurEuProvisions.length} provisions`);

// --- ACE 35 (Mercosur-Chile) provisions ---

const ace35Provisions = [
  {
    ref: '1', title: 'Establecimiento del area de libre comercio',
    content: 'Los Estados Partes del MERCOSUR y la Republica de Chile convienen en establecer un area de libre comercio en un plazo maximo de 10 anos, mediante la expansion y diversificacion del intercambio comercial y la eliminacion de las restricciones arancelarias y no arancelarias que afecten al comercio reciproco.',
    chapter: 'Titulo I - Objetivos', topic: 'free_movement'
  },
  {
    ref: '2', title: 'Programa de liberacion comercial',
    content: 'El programa de liberacion comercial se aplicara a los productos originarios y procedentes de los territorios de las Partes, clasificados en la nomenclatura NALADISA, mediante desgravaciones progresivas y automaticas aplicables sobre los gravamenes vigentes para terceros paises.',
    chapter: 'Titulo II - Programa de Liberacion', topic: 'free_movement'
  },
  {
    ref: '3', title: 'Arancel residual',
    content: 'Los aranceles residuales resultantes de la aplicacion de las preferencias pactadas en ningún caso podran ser superiores a los vigentes para terceros paises. En caso de que los aranceles para terceros paises sean reducidos por debajo del arancel preferencial, este ultimo se ajustara al nuevo nivel.',
    chapter: 'Titulo II - Programa de Liberacion', topic: 'free_movement'
  },
  {
    ref: '5', title: 'Regimen de origen',
    content: 'Se aplicara el Regimen General de Origen de la ALADI, con los requisitos especificos de origen que se establezcan entre las Partes. Seran considerados originarios los productos elaborados integramente en el territorio de cualquiera de las Partes y aquellos que cumplan con los requisitos especificos de origen.',
    chapter: 'Titulo III - Regimen de Origen', topic: 'customs_union'
  },
  {
    ref: '7', title: 'Clausulas de salvaguardia',
    content: 'Las Partes podran aplicar clausulas de salvaguardia de caracter transitorio a la importacion de productos que se beneficien de las preferencias pactadas en el presente Acuerdo, cuando estas importaciones causen o amenacen causar un dano grave a la produccion nacional de productos similares o directamente competidores.',
    chapter: 'Titulo IV - Clausulas de Salvaguardia', topic: 'free_movement'
  },
  {
    ref: '9', title: 'Practicas desleales de comercio',
    content: 'En la aplicacion de derechos antidumping o compensatorios, las Partes se regiran por las disposiciones de los Acuerdos pertinentes de la Organizacion Mundial del Comercio. Los derechos antidumping y compensatorios eventualmente aplicados por una Parte se determinaran de conformidad con las legislaciones internas de cada Parte.',
    chapter: 'Titulo V - Practicas Desleales', topic: 'customs_union'
  },
  {
    ref: '11', title: 'Solucion de controversias',
    content: 'Las controversias que surjan entre las Partes con motivo de la aplicacion, interpretacion o incumplimiento de las disposiciones contenidas en el presente Acuerdo seran resueltas mediante negociaciones directas. Si no se alcanzare un acuerdo mediante negociaciones directas, se podra recurrir a los mecanismos de solucion de controversias de la ALADI.',
    chapter: 'Titulo VI - Solucion de Controversias', topic: 'dispute_resolution'
  },
  {
    ref: '13', title: 'Normas tecnicas',
    content: 'Las Partes se comprometen a que las normas, reglamentos tecnicos y procedimientos de evaluacion de la conformidad no se apliquen de manera que constituyan obstaculos innecesarios al comercio. Se promovera la compatibilidad de las medidas de normalizacion y la aceptacion de los resultados de los procedimientos de evaluacion de la conformidad.',
    chapter: 'Titulo VII - Normas Tecnicas', topic: 'services'
  },
  {
    ref: '16', title: 'Servicios',
    content: 'Las Partes promoveran la liberalizacion del comercio de servicios, de conformidad con las disposiciones del Acuerdo General sobre el Comercio de Servicios (AGCS) de la OMC, con el objetivo de profundizar los compromisos asumidos en el ambito multilateral.',
    chapter: 'Titulo IX - Servicios', topic: 'services'
  },
  {
    ref: '18', title: 'Inversiones',
    content: 'Las Partes promoveran las inversiones reciprocas, otorgando un trato no menos favorable que el que concedan a las inversiones de nacionales de terceros paises, con sujecion a sus respectivas legislaciones internas y a los acuerdos internacionales aplicables.',
    chapter: 'Titulo X - Inversiones', topic: 'investment'
  },
  {
    ref: '20', title: 'Propiedad intelectual',
    content: 'Las Partes se comprometen a otorgar una adecuada y efectiva proteccion a los derechos de propiedad intelectual, de conformidad con las normas internacionales aplicables, en particular el Acuerdo sobre los ADPIC de la OMC.',
    chapter: 'Titulo XI - Propiedad Intelectual', topic: 'intellectual_property'
  },
  {
    ref: '22', title: 'Comision Administradora',
    content: 'Se establece una Comision Administradora del Acuerdo, integrada por los representantes de los Ministerios de Relaciones Exteriores y de los organismos responsables de la politica comercial de las Partes. La Comision Administradora se reunira al menos una vez al ano para evaluar la aplicacion del Acuerdo.',
    chapter: 'Titulo XII - Administracion del Acuerdo', topic: 'dispute_resolution'
  },
];

for (const p of ace35Provisions) {
  insertProvision.run(
    'ace-35-mercosur-chile', p.ref, p.title, p.content, p.chapter, p.topic,
  );
}
console.log(`  ACE 35 (Mercosur-Chile): ${ace35Provisions.length} provisions`);

// Count total provisions
const totalProvisions = (db.prepare('SELECT COUNT(*) AS c FROM provisions').get() as { c: number }).c;
console.log(`\nTotal provisions seeded: ${totalProvisions}`);

// ── Seed: data transfer rules ────────────────────────────────────────

const insertTransfer = db.prepare(`
  INSERT INTO data_transfer_rules (source_country, dest_country, framework, adequacy_status, transfer_mechanisms, restrictions, legal_basis)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const transferRules: Array<[string, string, string, string, string, string, string]> = [
  [
    'BR', 'AR',
    'LGPD (Brazil) + PDPA (Argentina)',
    'mutual_adequacy',
    'Adequacy decision, Standard contractual clauses, Binding corporate rules',
    'LGPD Article 33 requires adequate level of protection; ANPD authorization for specific transfers',
    'LGPD Art. 33-36; Ley 25.326 Art. 12'
  ],
  [
    'BR', 'UY',
    'LGPD (Brazil) + Ley 18.331 (Uruguay)',
    'mutual_adequacy',
    'Adequacy decision (Uruguay has EU adequacy), Standard contractual clauses, Binding corporate rules',
    'LGPD Article 33 requirements; Uruguay URCDP authorization may be required',
    'LGPD Art. 33-36; Ley 18.331 Art. 23'
  ],
  [
    'AR', 'UY',
    'PDPA (Argentina) + Ley 18.331 (Uruguay)',
    'mutual_adequacy',
    'Both countries have EU adequacy decisions; Standard contractual clauses available',
    'Standard PDPA transfer requirements apply; mutual recognition of adequate protection',
    'Ley 25.326 Art. 12; Ley 18.331 Art. 23'
  ],
  [
    'AR', 'PY',
    'PDPA (Argentina) + Ley 6534/20 (Paraguay)',
    'conditional',
    'Standard contractual clauses, Data subject consent, Binding corporate rules',
    'Paraguay enacted data protection law in 2020; adequacy not yet formally assessed by Argentina',
    'Ley 25.326 Art. 12; Ley 6534/20 Art. 34-36'
  ],
  [
    'BR', 'PY',
    'LGPD (Brazil) + Ley 6534/20 (Paraguay)',
    'conditional',
    'Standard contractual clauses, Data subject consent, ANPD authorization',
    'Paraguay Ley 6534/20 adopted in 2020; ANPD has not yet issued adequacy determination',
    'LGPD Art. 33-36; Ley 6534/20 Art. 34-36'
  ],
  [
    'CL', 'CO',
    'Ley 19.628 (Chile) + Ley 1581 (Colombia)',
    'conditional',
    'Standard contractual clauses, Data subject consent, Regulatory authorization',
    'Chile updating data protection framework (new law pending); Colombia SIC authorization may be required for certain transfers',
    'Ley 19.628 Art. 5; Ley 1581/2012 Art. 26; Decreto 1377/2013 Art. 24'
  ],
  [
    'MX', 'CO',
    'LFPDPPP (Mexico) + Ley 1581 (Colombia)',
    'conditional',
    'Standard contractual clauses, Data subject consent, Binding corporate rules, Privacy notice',
    'Mexico INAI whitelist applies; Colombia SIC authorization may be required',
    'LFPDPPP Art. 36-37; Ley 1581/2012 Art. 26'
  ],
  [
    'CL', 'PE',
    'Ley 19.628 (Chile) + Ley 29733 (Peru)',
    'conditional',
    'Standard contractual clauses, Data subject consent, Regulatory authorization',
    'Peru ANPD authorization required for international transfers; Chile reform pending',
    'Ley 19.628 Art. 5; Ley 29733 Art. 15'
  ],
  [
    'MX', 'PE',
    'LFPDPPP (Mexico) + Ley 29733 (Peru)',
    'conditional',
    'Standard contractual clauses, Data subject consent, INAI whitelist',
    'Peru ANPD authorization required; Mexico INAI maintains whitelist of adequate countries',
    'LFPDPPP Art. 36-37; Ley 29733 Art. 15'
  ],
  [
    'BR', 'EU',
    'LGPD (Brazil) + GDPR (EU)',
    'pending_adequacy',
    'Standard contractual clauses (SCC), Binding corporate rules, Derogations (Art. 49 GDPR)',
    'Brazil does not yet have EU adequacy decision; ANPD working toward adequacy assessment. SCCs required for most transfers.',
    'LGPD Art. 33-36; GDPR Art. 44-49'
  ],
  [
    'AR', 'EU',
    'PDPA (Argentina) + GDPR (EU)',
    'adequacy',
    'EU adequacy decision (Commission Decision 2003/490/EC), Standard contractual clauses also available',
    'Argentina has EU adequacy decision since 2003; transfers permitted without additional safeguards',
    'Ley 25.326 Art. 12; GDPR Art. 45; Commission Decision 2003/490/EC'
  ],
  [
    'UY', 'EU',
    'Ley 18.331 (Uruguay) + GDPR (EU)',
    'adequacy',
    'EU adequacy decision (Commission Decision 2012/484/EU), Standard contractual clauses also available',
    'Uruguay has EU adequacy decision since 2012; transfers permitted without additional safeguards',
    'Ley 18.331 Art. 23; GDPR Art. 45; Commission Decision 2012/484/EU'
  ],
  [
    'CL', 'MX',
    'Ley 19.628 (Chile) + LFPDPPP (Mexico)',
    'conditional',
    'Standard contractual clauses, Data subject consent, Privacy notice disclosures',
    'Both countries are Pacific Alliance members; no specific bilateral data transfer agreement yet. Standard mechanisms apply.',
    'Ley 19.628 Art. 5; LFPDPPP Art. 36-37'
  ],
  [
    'CO', 'PE',
    'Ley 1581 (Colombia) + Ley 29733 (Peru)',
    'conditional',
    'Standard contractual clauses, Data subject consent, SIC/ANPD authorization',
    'Both Pacific Alliance members; Colombia SIC and Peru ANPD authorizations may be required for specific transfers',
    'Ley 1581/2012 Art. 26; Ley 29733 Art. 15'
  ],
  [
    'BR', 'CL',
    'LGPD (Brazil) + Ley 19.628 (Chile)',
    'conditional',
    'Standard contractual clauses, Data subject consent, ANPD authorization',
    'Mercosur associate + bilateral relationship; Chile data protection reform pending. ANPD has not issued Chile adequacy determination.',
    'LGPD Art. 33-36; Ley 19.628 Art. 5'
  ],
];

for (const rule of transferRules) {
  insertTransfer.run(...rule);
}
console.log(`Data transfer rules seeded: ${transferRules.length}`);

// ── Seed: mutual recognition ─────────────────────────────────────────

const insertMutualRec = db.prepare(`
  INSERT INTO mutual_recognition (country_a, country_b, domain, agreement_id, description, status)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const mutualRecEntries: Array<[string, string, string, string | null, string, string]> = [
  ['BR', 'AR', 'customs_procedures', 'treaty-of-asuncion',
    'Mutual recognition of customs procedures and certificates of origin within the Mercosur customs union framework. Harmonized customs nomenclature (NCM) and origin certification.',
    'active'],
  ['BR', 'UY', 'customs_procedures', 'treaty-of-asuncion',
    'Mutual recognition of customs procedures, certificates of origin, and sanitary/phytosanitary certificates within Mercosur.',
    'active'],
  ['AR', 'UY', 'customs_procedures', 'treaty-of-asuncion',
    'Mutual recognition of customs documentation, origin certificates, and trade facilitation measures under Mercosur.',
    'active'],
  ['AR', 'PY', 'customs_procedures', 'treaty-of-asuncion',
    'Mutual recognition of Mercosur customs procedures, common external tariff application, and certificates of origin.',
    'active'],
  ['BR', 'PY', 'customs_procedures', 'treaty-of-asuncion',
    'Mutual recognition of customs procedures and origin certification within Mercosur. Special provisions for landlocked transit.',
    'active'],
  ['UY', 'PY', 'customs_procedures', 'treaty-of-asuncion',
    'Mutual recognition of Mercosur customs documentation and procedures.',
    'active'],
  ['BR', 'AR', 'product_standards', 'protocol-ouro-preto',
    'Mutual recognition of technical regulations and conformity assessment procedures for industrial products. Mercosur Technical Regulations (Reglamentos Tecnicos MERCOSUR) apply.',
    'active'],
  ['BR', 'UY', 'product_standards', 'protocol-ouro-preto',
    'Mutual recognition of Mercosur technical regulations (RTM) and conformity assessment for food safety, electrical products, and automotive components.',
    'active'],
  ['AR', 'UY', 'product_standards', 'protocol-ouro-preto',
    'Mutual recognition of Mercosur technical regulations and product certification procedures.',
    'active'],
  ['CL', 'CO', 'product_standards', 'pa-additional-protocol',
    'Mutual recognition of conformity assessment results and technical regulations under the Pacific Alliance Additional Protocol, Chapter on Technical Barriers to Trade.',
    'active'],
  ['CL', 'MX', 'product_standards', 'pa-additional-protocol',
    'Mutual recognition of conformity assessment procedures for selected product categories under the Pacific Alliance framework.',
    'active'],
  ['CO', 'PE', 'product_standards', 'pa-additional-protocol',
    'Mutual recognition of conformity assessment results under the Pacific Alliance Additional Protocol.',
    'active'],
  ['MX', 'PE', 'product_standards', 'pa-additional-protocol',
    'Mutual recognition of technical standards and conformity assessment under the Pacific Alliance.',
    'active'],
  ['BR', 'AR', 'professional_qualifications', null,
    'Mutual recognition of university degrees and professional qualifications under the Mercosur Educational Agreement (Protocol of Integration Educativa, 2005). Covers regulated professions including engineering, medicine, and law.',
    'active'],
  ['BR', 'UY', 'professional_qualifications', null,
    'Mutual recognition of higher education degrees under Mercosur educational integration protocols. Accreditation via ARCU-SUR mechanism.',
    'active'],
  ['AR', 'UY', 'professional_qualifications', null,
    'Mutual recognition of professional qualifications and university degrees within Mercosur. ARCU-SUR accreditation system applies.',
    'active'],
  ['BR', 'AR', 'data_protection', 'mercosur-data-protection',
    'Mutual recognition of data protection frameworks between Brazil (LGPD) and Argentina (Ley 25.326). Both recognized as providing adequate level of protection for intra-Mercosur data transfers.',
    'active'],
  ['BR', 'UY', 'data_protection', 'mercosur-data-protection',
    'Mutual recognition of data protection frameworks. Uruguay (Ley 18.331) has EU adequacy; Brazil (LGPD) pursuing adequacy. Intra-Mercosur transfers facilitated.',
    'active'],
  ['AR', 'UY', 'data_protection', 'mercosur-data-protection',
    'Mutual recognition of adequate data protection. Both Argentina and Uruguay hold EU adequacy decisions. Intra-Mercosur data transfers permitted without additional safeguards.',
    'active'],
  ['CL', 'CO', 'data_protection', 'pa-digital-agenda',
    'Pacific Alliance members committed to harmonizing data protection frameworks and facilitating cross-border data flows under the Digital Agenda. Formal mutual recognition pending legislative reforms.',
    'in_progress'],
  ['BR', 'CL', 'customs_procedures', 'ace-35-mercosur-chile',
    'Mutual recognition of certificates of origin and customs procedures under ACE 35. Chile as Mercosur associate state benefits from streamlined customs processing.',
    'active'],
  ['AR', 'CL', 'customs_procedures', 'ace-35-mercosur-chile',
    'Mutual recognition of origin certificates and customs procedures under ACE 35 and bilateral arrangements. Simplified border crossing procedures for goods.',
    'active'],
];

for (const entry of mutualRecEntries) {
  insertMutualRec.run(...entry);
}
console.log(`Mutual recognition entries seeded: ${mutualRecEntries.length}`);

// ── Seed: digital trade obligations ──────────────────────────────────

const insertDigitalObligation = db.prepare(`
  INSERT INTO digital_trade_obligations (agreement_id, countries, obligation, chapter, description, legal_basis)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const digitalObligations: Array<[string, string, string, string, string, string]> = [
  // Mercosur Digital Agenda
  ['mercosur-digital-agenda', 'BR,AR,UY,PY',
    'Promote cross-border electronic commerce',
    'Digital Agenda', 'States Parties shall promote the development of electronic commerce in the region, facilitating cross-border electronic transactions and consumer protection online.',
    'CMC Decision 13/15, Art. 3'],
  ['mercosur-digital-agenda', 'BR,AR,UY,PY',
    'Mutual recognition of electronic signatures',
    'Digital Agenda', 'States Parties shall mutually recognize the legal validity of electronic signatures and electronic documents in accordance with harmonized standards.',
    'CMC Decision 13/15, Art. 5'],
  ['mercosur-digital-agenda', 'BR,AR,UY,PY',
    'Adopt adequate data protection frameworks',
    'Digital Agenda', 'States Parties commit to adopting adequate data protection legal frameworks that guarantee an adequate level of protection while facilitating cross-border data flows necessary for trade and regional cooperation.',
    'CMC Decision 13/15, Art. 6'],
  ['mercosur-digital-agenda', 'BR,AR,UY,PY',
    'Facilitate cross-border data transfers',
    'Digital Agenda', 'States Parties shall promote mechanisms that facilitate the international transfer of personal data between Member States, provided an adequate level of protection is ensured.',
    'CMC Decision 13/15, Art. 7'],
  ['mercosur-digital-agenda', 'BR,AR,UY,PY',
    'Cybersecurity cooperation',
    'Digital Agenda', 'States Parties commit to promoting information security and cybersecurity, developing national and regional capacities, sharing threat and vulnerability information, and cooperating in computer security incident response.',
    'CMC Decision 13/15, Art. 8'],

  // Mercosur E-Commerce Agreement
  ['mercosur-e-commerce', 'BR,AR,UY,PY',
    'No customs duties on electronic transmissions',
    'E-Commerce Agreement', 'States Parties shall not impose customs duties, tariffs, or other charges on electronic transmissions between States Parties.',
    'Acuerdo sobre Comercio Electronico, Art. 3'],
  ['mercosur-e-commerce', 'BR,AR,UY,PY',
    'Recognize electronic signatures and contracts',
    'E-Commerce Agreement', 'No Party shall deny the legal validity of a signature solely on the ground that it is electronic. Each Party shall adopt legislation enabling electronic transactions.',
    'Acuerdo sobre Comercio Electronico, Art. 4'],
  ['mercosur-e-commerce', 'BR,AR,UY,PY',
    'Protect personal data in e-commerce',
    'E-Commerce Agreement', 'Each Party shall adopt or maintain a legal framework providing for the protection of personal data of e-commerce users, taking into account relevant international principles.',
    'Acuerdo sobre Comercio Electronico, Art. 6'],
  ['mercosur-e-commerce', 'BR,AR,UY,PY',
    'Facilitate cross-border data flows',
    'E-Commerce Agreement', 'Parties commit to not restricting cross-border data flows by electronic means when necessary for business conduct, subject to applicable data protection legislation.',
    'Acuerdo sobre Comercio Electronico, Art. 7'],
  ['mercosur-e-commerce', 'BR,AR,UY,PY',
    'No data localization requirements',
    'E-Commerce Agreement', 'No Party shall require a covered service supplier to use or locate computing facilities in the territory of the Party as a condition for conducting business, subject to data protection provisions.',
    'Acuerdo sobre Comercio Electronico, Art. 8'],

  // Pacific Alliance Additional Protocol
  ['pa-additional-protocol', 'CL,CO,MX,PE',
    'No customs duties on electronic transmissions',
    'Chapter 13 - E-Commerce', 'No Party may impose customs duties, fees, or charges on the import or export of electronic transmissions, including electronically transmitted content.',
    'Additional Protocol, Art. 13.2'],
  ['pa-additional-protocol', 'CL,CO,MX,PE',
    'Online consumer protection',
    'Chapter 13 - E-Commerce', 'Parties recognize the importance of adopting and maintaining transparent and effective consumer protection measures for e-commerce transactions.',
    'Additional Protocol, Art. 13.4'],
  ['pa-additional-protocol', 'CL,CO,MX,PE',
    'Protect personal data in digital trade',
    'Chapter 13 - E-Commerce', 'Parties recognize the importance of protecting personal data of e-commerce users and shall adopt or maintain a legal framework for personal data protection.',
    'Additional Protocol, Art. 13.5'],
  ['pa-additional-protocol', 'CL,CO,MX,PE',
    'National treatment for digital services',
    'Chapter 9 - Services', 'Each Party shall accord to services and service suppliers of another Party treatment no less favorable than that it accords to its own like services and service suppliers.',
    'Additional Protocol, Art. 9.1'],
  ['pa-additional-protocol', 'CL,CO,MX,PE',
    'IP protection for digital content',
    'Chapter 14 - IP', 'Parties affirm their existing rights and obligations under the TRIPS Agreement. Protection extends to digital content and electronic distribution.',
    'Additional Protocol, Art. 14.1'],

  // Pacific Alliance Digital Agenda
  ['pa-digital-agenda', 'CL,CO,MX,PE',
    'Create regional digital market',
    'Digital Agenda', 'Member countries shall promote the creation of a regional digital market facilitating cross-border e-commerce, regulatory framework interoperability, and the elimination of unnecessary barriers to digital trade.',
    'Hoja de Ruta Agenda Digital, Section 2'],
  ['pa-digital-agenda', 'CL,CO,MX,PE',
    'Enable cross-border data flows',
    'Digital Agenda', 'Member countries recognize the importance of cross-border data flows for the digital economy and commit to not imposing unnecessary restrictions, while ensuring personal data protection.',
    'Hoja de Ruta Agenda Digital, Section 6'],
  ['pa-digital-agenda', 'CL,CO,MX,PE',
    'Interoperability of digital government systems',
    'Digital Agenda', 'Member countries shall promote interoperability of digital government systems, facilitating mutual recognition of digital identities, electronic signatures, and electronic documents.',
    'Hoja de Ruta Agenda Digital, Section 4'],

  // PROSUR Digital Economy Declaration
  ['prosur-digital-declaration', 'AR,BR,CL,CO,EC,GY,PE,PY,SR,UY',
    'Facilitate digital commerce across South America',
    'Digital Economy Declaration', 'Member countries shall promote the facilitation of cross-border digital trade, including simplifying customs procedures for e-commerce and harmonizing digital services regulatory frameworks.',
    'PROSUR Declaration, Section 3'],
  ['prosur-digital-declaration', 'AR,BR,CL,CO,EC,GY,PE,PY,SR,UY',
    'Harmonize data protection frameworks',
    'Digital Economy Declaration', 'Member countries recognize the need for adequate data protection legal frameworks compatible with digital economy development and commit to working on harmonizing data protection and privacy regulations.',
    'PROSUR Declaration, Section 4'],
  ['prosur-digital-declaration', 'AR,BR,CL,CO,EC,GY,PE,PY,SR,UY',
    'Cybersecurity cooperation',
    'Digital Economy Declaration', 'Member countries shall cooperate on cybersecurity capacity building, including creating national CSIRTs, sharing cyber threat information, and developing harmonized cybersecurity regulatory frameworks.',
    'PROSUR Declaration, Section 5'],
  ['prosur-digital-declaration', 'AR,BR,CL,CO,EC,GY,PE,PY,SR,UY',
    'Responsible AI governance',
    'Digital Economy Declaration', 'Member countries shall cooperate on developing and governing AI and other emerging technologies responsibly, promoting ethical and regulatory frameworks balancing innovation with fundamental rights protection.',
    'PROSUR Declaration, Section 9'],

  // Mercosur-EU Association Agreement
  ['mercosur-eu-association', 'BR,AR,UY,PY,EU',
    'No customs duties on electronic transmissions',
    'Trade Chapter - Digital Trade', 'Parties agree not to impose customs duties on electronic transmissions. Each Party may impose internal taxes consistent with Mercosur and EU obligations.',
    'Mercosur-EU Association Agreement, Art. 7'],
  ['mercosur-eu-association', 'BR,AR,UY,PY,EU',
    'Protect personal data in cross-border trade',
    'Trade Chapter - Data Flows', 'Parties commit to ensuring data protection and privacy. Each Party may adopt measures to ensure personal data protection, including rules on cross-border personal data transfer.',
    'Mercosur-EU Association Agreement, Art. 8'],
  ['mercosur-eu-association', 'BR,AR,UY,PY,EU',
    'Regulatory cooperation on digital trade',
    'Trade Chapter - Cooperation', 'Parties shall promote regulatory cooperation to reduce unnecessary differences between regulatory frameworks, improving compatibility of regulatory measures for digital services.',
    'Mercosur-EU Association Agreement, Art. 12'],
];

for (const ob of digitalObligations) {
  insertDigitalObligation.run(...ob);
}
console.log(`Digital trade obligations seeded: ${digitalObligations.length}`);

// ── Update source item counts ────────────────────────────────────────

const agreementCount = (db.prepare('SELECT COUNT(*) AS c FROM agreements').get() as { c: number }).c;
const provisionCount = (db.prepare('SELECT COUNT(*) AS c FROM provisions').get() as { c: number }).c;
const transferRuleCount = (db.prepare('SELECT COUNT(*) AS c FROM data_transfer_rules').get() as { c: number }).c;
const mutualRecCount = (db.prepare('SELECT COUNT(*) AS c FROM mutual_recognition').get() as { c: number }).c;
const digitalObCount = (db.prepare('SELECT COUNT(*) AS c FROM digital_trade_obligations').get() as { c: number }).c;

// Update source counts
db.prepare('UPDATE sources SET item_count = ? WHERE id = ?').run(
  (db.prepare("SELECT COUNT(*) AS c FROM agreements WHERE bloc_id = 'mercosur'").get() as { c: number }).c,
  'mercosur-secretariat',
);
db.prepare('UPDATE sources SET item_count = ? WHERE id = ?').run(
  (db.prepare("SELECT COUNT(*) AS c FROM agreements WHERE bloc_id = 'pacific_alliance'").get() as { c: number }).c,
  'pacific-alliance-portal',
);
db.prepare('UPDATE sources SET item_count = ? WHERE id = ?').run(
  (db.prepare("SELECT COUNT(*) AS c FROM agreements WHERE bloc_id = 'prosur'").get() as { c: number }).c,
  'prosur-portal',
);
db.prepare('UPDATE sources SET item_count = ? WHERE id = ?').run(
  transferRuleCount + mutualRecCount,
  'bilateral-agreements',
);

console.log('\nSource item counts updated.');

// ── Insert metadata ──────────────────────────────────────────────────────

const insertMeta = db.prepare('INSERT OR REPLACE INTO db_metadata (key, value) VALUES (?, ?)');
insertMeta.run('schema_version', '1.0');
insertMeta.run('mcp_name', 'mercosur-trade-mcp');
insertMeta.run('category', 'domain_intelligence');
insertMeta.run('build_date', today);

// ── Rebuild FTS ──────────────────────────────────────────────────────────

console.log('Rebuilding FTS indexes...');
db.exec("INSERT INTO provisions_fts(provisions_fts) VALUES('rebuild')");
console.log('FTS indexes rebuilt.');

// ── Finalize ─────────────────────────────────────────────────────────────

// Set journal mode to DELETE (required for WASM compatibility on Vercel)
db.pragma('journal_mode = DELETE');
db.exec('VACUUM');
db.close();

// ── Report ───────────────────────────────────────────────────────────────

const dbSize = statSync(DB_PATH).size;
const dbSizeMB = (dbSize / 1024 / 1024).toFixed(2);

console.log('\n=== Build Complete ===');
console.log(`Trade Blocs:          3`);
console.log(`Sources:              4`);
console.log(`Agreements:           ${agreementCount}`);
console.log(`Provisions:           ${provisionCount}`);
console.log(`Data Transfer Rules:  ${transferRuleCount}`);
console.log(`Mutual Recognition:   ${mutualRecCount}`);
console.log(`Digital Obligations:  ${digitalObCount}`);
console.log(`Database Size:        ${dbSizeMB} MB`);
console.log(`Strategy:             A (Vercel Bundled)`);
console.log(`Journal Mode:         DELETE`);
