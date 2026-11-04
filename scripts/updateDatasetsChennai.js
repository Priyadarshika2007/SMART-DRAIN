import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// 10 candidate Chennai-area locations with synthetic representative coordinates
const CHENNAI_AREAS = [
  { name: 'Velachery', centerLat: 12.9759, centerLng: 80.2212 },
  { name: 'Tambaram', centerLat: 12.9249, centerLng: 80.1200 },
  { name: 'Ambattur', centerLat: 13.0983, centerLng: 80.1613 },
  { name: 'Avadi', centerLat: 13.1147, centerLng: 80.1098 },
  { name: 'Sholinganallur', centerLat: 12.8996, centerLng: 80.2279 },
  { name: 'Perungudi', centerLat: 12.9654, centerLng: 80.2461 },
  { name: 'Madhavaram', centerLat: 13.1488, centerLng: 80.2306 },
  { name: 'Thiruvottiyur', centerLat: 13.1600, centerLng: 80.3013 },
  { name: 'Pallavaram', centerLat: 12.9675, centerLng: 80.1491 },
  { name: 'Chennai', centerLat: 13.0827, centerLng: 80.2707 },
];

function updateDrainsCsv() {
  const filePath = path.join(DATA_DIR, 'drains.csv');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split(/\r?\n/);
  const header = lines[0];

  const updatedRows = [header];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const drainId = parts[0]; // DRN001 .. DRN100
    const index = i - 1; // 0 .. 99

    const areaIndex = Math.min(Math.floor(index / 10), CHENNAI_AREAS.length - 1);
    const area = CHENNAI_AREAS[areaIndex];
    const chamberNumStr = String(index + 1).padStart(3, '0');
    const locationName = `${area.name} Chamber ${chamberNumStr}`;

    // Synthetic coordinates distributed around the area center
    const subIdx = index % 10;
    const latOffset = ((subIdx % 5) - 2) * 0.0032 + (Math.floor(subIdx / 5) === 0 ? -0.0018 : 0.0018);
    const lngOffset = ((subIdx % 4) - 1.5) * 0.0036 + (Math.floor(subIdx / 4) === 0 ? -0.0015 : 0.0015);
    const lat = (area.centerLat + latOffset).toFixed(7);
    const lng = (area.centerLng + lngOffset).toFixed(7);

    // Keep installation_date, drain_status, created_at, updated_at
    const installDate = parts[4];
    const status = parts[5];
    const createdAt = parts[6];
    const updatedAt = parts[7] || parts[6];

    updatedRows.push(`${drainId},${locationName},${lat},${lng},${installDate},${status},${createdAt},${updatedAt}`);
  }

  fs.writeFileSync(filePath, updatedRows.join('\n') + '\n', 'utf8');
  console.log(`✓ Updated drains.csv: ${updatedRows.length - 1} records with Chennai locations and synthetic coordinates.`);
}

function updateDevicesCsv() {
  const filePath = path.join(DATA_DIR, 'devices.csv');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split(/\r?\n/);
  const header = lines[0];

  const updatedRows = [header];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const deviceId = parts[0];
    const drainId = parts[1];
    const controller = parts[2];
    const unitNumStr = String(i).padStart(3, '0');
    const deviceName = `URBANDRAIN 2.0 Unit ${unitNumStr}`;
    const firmware = parts[4];
    const installDate = parts[5];
    const status = parts[6];
    const lastSeen = parts[7];
    const createdAt = parts[8];

    updatedRows.push(`${deviceId},${drainId},${controller},${deviceName},${firmware},${installDate},${status},${lastSeen},${createdAt}`);
  }

  fs.writeFileSync(filePath, updatedRows.join('\n') + '\n', 'utf8');
  console.log(`✓ Updated devices.csv: ${updatedRows.length - 1} records with URBANDRAIN 2.0 branding.`);
}

function updateUsersCsv() {
  const filePath = path.join(DATA_DIR, 'users.csv');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split(/\r?\n/);
  const header = lines[0];

  const updatedRows = [
    header,
    '1,Priyadarshika G K,priyadarshika,priyadarshika@urbandrain.local,<password_hash>,admin,Chennai,true,2026-09-01 09:00:00,2026-10-09 14:00:00',
    '2,Project Operator,operator01,operator01@urbandrain.local,<password_hash>,operator,Velachery,true,2026-09-02 10:00:00,2026-10-07 16:30:00',
    '3,Maintenance User,maint01,maint01@urbandrain.local,<password_hash>,maintenance,Tambaram,true,2026-09-03 11:00:00,2026-10-06 14:15:00',
    '4,System Viewer,viewer01,viewer01@urbandrain.local,<password_hash>,viewer,Ambattur,true,2026-09-04 12:00:00,2026-10-01 09:30:00',
  ];

  fs.writeFileSync(filePath, updatedRows.join('\n') + '\n', 'utf8');
  console.log(`✓ Updated users.csv: 4 records with Chennai areas and URBANDRAIN email domain.`);
}

updateDrainsCsv();
updateDevicesCsv();
updateUsersCsv();

console.log('🎉 CSV dataset migration to Chennai completed successfully!');
